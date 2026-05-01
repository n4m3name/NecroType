// The orchestrator. Combines the cached glyphs, distortion, global transform, multi-pass
// extrusion, and bbox computation into a single `RenderData` payload that both renderers consume.

import type { Font } from "opentype.js";
import type { GlyphContours, Params, Polyline, Point, RenderData, RenderResult, Segment } from "../types";
import { distortGlyph } from "./distort";
import { applyGlobalTransform } from "./transform";
import { extrudeFromContour, buildGlyphHash } from "./extrude";
import { getCachedGlyphs, FONT_RENDER_SIZE } from "./glyphs";
import { makeRNG } from "./rng";
import { makeSpatialHash } from "./hash";
import { startBudget, budgetWasHit } from "./budget";

const PASS_WIDTH_DECAY = 0.55;

export interface GenerateOptions {
  fast: boolean;
}

function computeViewBox(distorted: GlyphContours[], tendrils: Segment[], pad: number) {
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const g of distorted) for (const c of g) for (const p of c) {
    if (p.x < xMin) xMin = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.x > xMax) xMax = p.x;
    if (p.y > yMax) yMax = p.y;
  }
  for (const s of tendrils) {
    if (s.a.x < xMin) xMin = s.a.x;
    if (s.b.x < xMin) xMin = s.b.x;
    if (s.a.x > xMax) xMax = s.a.x;
    if (s.b.x > xMax) xMax = s.b.x;
    if (s.a.y < yMin) yMin = s.a.y;
    if (s.b.y < yMin) yMin = s.b.y;
    if (s.a.y > yMax) yMax = s.a.y;
    if (s.b.y > yMax) yMax = s.b.y;
  }
  if (!isFinite(xMin)) return { x: 0, y: 0, w: 100, h: 100 };
  return { x: xMin - pad, y: yMin - pad, w: (xMax - xMin) + 2 * pad, h: (yMax - yMin) + 2 * pad };
}

/** Run the full pipeline. `opts.fast = true` skips the spatial-hash overlap check (the
 *  biggest perf hog) so the rAF preview keeps up with slider drags. The full quality
 *  render that runs after 250ms idle layers in the overlap-induced terminations. */
export function generate(font: Font, paramsIn: Params, opts: GenerateOptions): RenderResult {
  // Clone params so fast-mode tweaks don't leak
  const p: Params = { ...paramsIn };
  if (opts.fast) p.overlap = 1;

  const t0 = performance.now();
  startBudget(opts.fast ? 80 : 700);

  const rng = makeRNG(p.seed);
  const glyphs = getCachedGlyphs(font, p.text, p.fontUrl, FONT_RENDER_SIZE);

  // Stage 2: per-glyph distortion
  const distorted = glyphs.map((gc) => distortGlyph(gc, p, rng));
  // Stage 2.5: whole-logo transforms
  applyGlobalTransform(distorted, p);

  // Logo bbox center for symmetry + directionality
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const g of distorted) for (const c of g) for (const pt of c) {
    if (pt.x < xMin) xMin = pt.x;
    if (pt.x > xMax) xMax = pt.x;
    if (pt.y < yMin) yMin = pt.y;
    if (pt.y > yMax) yMax = pt.y;
  }
  const logoCenter: Point = { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2 };
  const logoHalfH = Math.max((yMax - yMin) / 2, 1);

  // Stage 3: multi-pass extrusion
  const tendrils: Segment[] = [];
  let outlinesForExtrude: GlyphContours[] = distorted;
  let rootsForPass = p.roots;
  const hash = p.overlap < 1 ? makeSpatialHash(Math.max(10, p.length / 3)) : null;
  if (hash) buildGlyphHash(distorted, hash);

  const SEG_CAP = opts.fast ? 8000 : 60000;

  for (let pass = 0; pass < p.passes; pass++) {
    if (budgetWasHit()) break;
    const isFirstPass = pass === 0;
    const widthMul = isFirstPass ? p.firstPassBoost : Math.pow(PASS_WIDTH_DECAY, pass);
    const passSegs: Segment[] = [];
    for (let gi = 0; gi < outlinesForExtrude.length; gi++) {
      if (budgetWasHit()) break;
      const glyph = outlinesForExtrude[gi];
      // First-pass tendrils are owned by glyph index gi (skip self in collision check).
      // Later passes pass -1 (no skip) — they grow from chains of previous tendrils.
      const useGi = isFirstPass ? gi : -1;
      for (const contour of glyph) {
        if (budgetWasHit()) break;
        const segs = extrudeFromContour(
          contour, p, rng, rootsForPass,
          logoCenter, logoHalfH, isFirstPass,
          hash, widthMul, useGi,
        );
        passSegs.push(...segs);
        if (tendrils.length + passSegs.length > SEG_CAP) break;
      }
      if (tendrils.length + passSegs.length > SEG_CAP) break;
    }
    tendrils.push(...passSegs);
    if (tendrils.length > SEG_CAP) break;

    if (pass + 1 < p.passes && passSegs.length) {
      // Build pseudo-contours from the placed tendril segments for the next pass.
      const chains: Polyline[] = [];
      let cur: Point[] | null = null;
      for (const s of passSegs) {
        if (!cur) {
          cur = [s.a, s.b];
          continue;
        }
        const last = cur[cur.length - 1];
        if (Math.abs(s.a.x - last.x) < 0.01 && Math.abs(s.a.y - last.y) < 0.01) {
          cur.push(s.b);
        } else {
          if (cur.length > 2) chains.push(cur);
          cur = [s.a, s.b];
        }
      }
      if (cur && cur.length > 2) chains.push(cur);
      outlinesForExtrude = [chains];
      rootsForPass = Math.max(2, Math.floor(rootsForPass * 0.25));
    }
  }

  const viewBox = computeViewBox(distorted, tendrils, 30);
  const data: RenderData = { distortedGlyphs: distorted, tendrils, viewBox };

  return {
    data,
    segCount: tendrils.length,
    durationMs: performance.now() - t0,
    partial: budgetWasHit(),
  };
}
