// Stage 3: directional extrusion. Pick K root points on each contour, grow a tendril outward,
// optionally branch recursively. Spatial hash + glyphIdx tagging let us reject crossings while
// allowing tendrils to start on their own glyph contour without immediately self-rejecting.

import type { Params, Point, Polyline, Segment } from "../types";
import { dist, normalize, rotate, segsIntersect, signedArea } from "./geometry";
import { gauss, expSample, type RNG } from "./rng";
import { hashInsert, hashNearby, type SpatialHash } from "./hash";
import { overBudget } from "./budget";

/** Pick a uniform-arclength root on a polyline; return the point and the local tangent there. */
function pickRoot(contour: Polyline, rng: RNG): { p: Point; tan: Point } {
  let totalLen = 0;
  for (let i = 1; i < contour.length; i++) totalLen += dist(contour[i - 1], contour[i]);
  const target = rng() * totalLen;
  let acc = 0;
  for (let i = 1; i < contour.length; i++) {
    const segLen = dist(contour[i - 1], contour[i]);
    if (acc + segLen >= target) {
      const t = (target - acc) / (segLen || 1);
      const a = contour[i - 1];
      const b = contour[i];
      const p: Point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const tan = normalize({ x: b.x - a.x, y: b.y - a.y });
      return { p, tan };
    }
    acc += segLen;
  }
  // fallback (shouldn't happen for a valid contour)
  const a = contour[contour.length - 1];
  return { p: { x: a.x, y: a.y }, tan: { x: 1, y: 0 } };
}

function outwardNormal(tan: Point, isCCW: boolean): Point {
  return isCCW ? { x: tan.y, y: -tan.x } : { x: -tan.y, y: tan.x };
}

const STEP_LEN = 2.0;
const MIN_TENDRIL_SEGS = 3;
const REF_SEGS_FOR_FULL_WIDTH = 20;
const BUDGET_POLL_INTERVAL = 32;

/** Grow one tendril outward. Discarded if it terminates with fewer than MIN_TENDRIL_SEGS
 *  segments (otherwise short stubs render as fat dots). The base width is scaled by the
 *  actual tendril length, so 4-seg tendrils look like skinny spikes, not chunky pills. */
function growTendril(
  start: Point, dir: Point, lengthBudget: number,
  params: Params, rng: RNG, depth: number,
  segs: Segment[], hash: SpatialHash | null,
  widthMul: number, glyphIdx: number,
): void {
  let pos: Point = { ...start };
  let curDir: Point = { ...dir };
  let traveled = 0;
  const totalLen = lengthBudget;
  const overlap = params.overlap;
  const useCheck = hash !== null && overlap < 1;
  let stepsSinceStart = 0;
  let stepsToBudgetCheck = BUDGET_POLL_INTERVAL;
  const localSegs: Segment[] = [];

  while (traveled < lengthBudget) {
    if (--stepsToBudgetCheck <= 0) {
      stepsToBudgetCheck = BUDGET_POLL_INTERVAL;
      if (overBudget()) break;
    }
    const next: Point = {
      x: pos.x + curDir.x * STEP_LEN,
      y: pos.y + curDir.y * STEP_LEN,
    };
    if (useCheck && stepsSinceStart > 2) {
      const nearby = hashNearby(hash!, pos.x, pos.y, next.x, next.y);
      let cross = false;
      for (const s of nearby) {
        if (glyphIdx >= 0 && s.glyphIdx === glyphIdx) continue;
        if (segsIntersect(pos, next, s.a, s.b)) {
          cross = true;
          break;
        }
      }
      if (cross && rng() >= overlap) break;
    }
    const tFrac = traveled / Math.max(totalLen, 1);
    const widthFactor = 1 - params.taper * tFrac;
    const seg: Segment = {
      a: pos,
      b: next,
      width: Math.max(widthFactor, 0.05) * (widthMul || 1),
      glyphIdx: -2,
    };
    localSegs.push(seg);
    if (hash) hashInsert(hash, seg);

    curDir = rotate(curDir, (rng() - 0.5) * params.curl);

    if (depth < 4 && rng() < params.branch) {
      const branchAngle = (rng() - 0.5) * Math.PI * 0.6;
      const branchDir = rotate(curDir, branchAngle);
      const branchBudget = (lengthBudget - traveled) * (0.4 + rng() * 0.4);
      growTendril(next, branchDir, branchBudget, params, rng, depth + 1, segs, hash, widthMul, glyphIdx);
    }
    pos = next;
    traveled += STEP_LEN;
    stepsSinceStart++;
  }

  // Commit only if the tendril is long enough; scale base width by length so short ones
  // look like skinny spikes rather than fat stubs.
  if (localSegs.length >= MIN_TENDRIL_SEGS) {
    const lengthScale = Math.min(1, localSegs.length / REF_SEGS_FOR_FULL_WIDTH);
    for (let i = 0; i < localSegs.length; i++) {
      const s = localSegs[i];
      s.width *= lengthScale;
      segs.push(s);
    }
  }
}

export function extrudeFromContour(
  contour: Polyline, params: Params, rng: RNG,
  perContour: number,
  logoCenter: Point, logoHalfH: number,
  applyDirectionality: boolean,
  hash: SpatialHash | null,
  widthMul: number, glyphIdx: number,
): Segment[] {
  if (!contour || contour.length < 3) return [];
  const segs: Segment[] = [];
  const ccw = signedArea(contour) > 0;
  const dirStrength = applyDirectionality ? params.direction : 0;
  const symStrength = params.symmetry;
  for (let i = 0; i < perContour; i++) {
    if (overBudget()) break;
    const { p, tan } = pickRoot(contour, rng);
    const n = outwardNormal(tan, ccw);
    const angleJitter = gauss(rng) * (params.angle * Math.PI / 180);
    let dir = rotate(n, angleJitter);

    // Directionality bias: blend tendril direction toward (0, ±t) where t = relative y in logo
    if (dirStrength > 0 && logoHalfH > 0) {
      const tNorm = (p.y - logoCenter.y) / logoHalfH;
      const biasX = 0;
      const biasY = tNorm;
      const bx = (1 - dirStrength) * dir.x + dirStrength * biasX;
      const by = (1 - dirStrength) * dir.y + dirStrength * biasY;
      const m = Math.hypot(bx, by);
      if (m > 1e-6) dir = { x: bx / m, y: by / m };
    }

    const len = expSample(rng, params.length);
    const segsBefore = segs.length;
    growTendril(p, dir, Math.max(len, 4), params, rng, 0, segs, hash, widthMul, glyphIdx);

    // Symmetry: with prob symStrength, geometrically mirror the just-grown tendril.
    if (symStrength > 0 && rng() < symStrength) {
      const mirrorX = logoCenter.x;
      const newCount = segs.length - segsBefore;
      for (let j = 0; j < newCount; j++) {
        const s = segs[segsBefore + j];
        const ms: Segment = {
          a: { x: 2 * mirrorX - s.a.x, y: s.a.y },
          b: { x: 2 * mirrorX - s.b.x, y: s.b.y },
          width: s.width,
          glyphIdx: -2,
        };
        segs.push(ms);
        if (hash) hashInsert(hash, ms);
      }
    }
  }
  return segs;
}

/** Insert all distorted glyph contour edges into the hash, tagged with their glyph index.
 *  This makes tendrils respect letter boundaries (a tendril from M can't cross through O). */
export function buildGlyphHash(distorted: import("../types").GlyphContours[], hash: SpatialHash): void {
  for (let gi = 0; gi < distorted.length; gi++) {
    const glyph = distorted[gi];
    for (const contour of glyph) {
      for (let i = 0; i < contour.length - 1; i++) {
        hashInsert(hash, { a: contour[i], b: contour[i + 1], width: 0, glyphIdx: gi });
      }
    }
  }
}
