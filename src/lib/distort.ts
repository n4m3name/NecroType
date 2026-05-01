// Stage 2: per-glyph distortion. Affine perturbation around the glyph center + per-vertex
// coherent-noise displacement. Each glyph is randomized independently, but the vertex noise
// is spatially coherent so the result looks organic rather than fuzzy.

import type { GlyphContours, Params, Point, Polyline } from "../types";
import { resample } from "./geometry";
import { gauss, type RNG } from "./rng";
import { snoise2D } from "./noise";

function distortContour(contour: Polyline, params: Params, rng: RNG, glyphCenter: Point): Polyline {
  const resampled = resample(contour, params.resampleStep || 2.5);
  const theta = gauss(rng) * params.affine;
  const sx = 1 + gauss(rng) * params.affine * 0.5;
  const sy = 1 + gauss(rng) * params.affine * 0.5;
  const shx = gauss(rng) * params.affine * 0.5;
  const shy = gauss(rng) * params.affine * 0.5;
  const cs = Math.cos(theta);
  const sn = Math.sin(theta);
  const noiseSeedX = (rng() * 1e6) | 0;
  const noiseSeedY = (rng() * 1e6) | 0;
  const out: Point[] = new Array(resampled.length);
  for (let i = 0; i < resampled.length; i++) {
    const p = resampled[i];
    let dx = p.x - glyphCenter.x;
    let dy = p.y - glyphCenter.y;
    // shear → scale → rotate (anchored at glyph center)
    const dx2 = dx + shx * dy;
    const dy2 = dy + shy * dx;
    const dx3 = dx2 * sx;
    const dy3 = dy2 * sy;
    const dx4 = dx3 * cs - dy3 * sn;
    const dy4 = dx3 * sn + dy3 * cs;
    let nx = dx4 + glyphCenter.x;
    let ny = dy4 + glyphCenter.y;
    // Per-vertex coherent noise displacement
    if (params.vnoise > 0) {
      const fx = nx * params.vfreq;
      const fy = ny * params.vfreq;
      const nox = snoise2D(fx, fy, noiseSeedX);
      const noy = snoise2D(fx + 100, fy + 100, noiseSeedY);
      nx += nox * params.vnoise;
      ny += noy * params.vnoise;
    }
    out[i] = { x: nx, y: ny };
  }
  return out;
}

export function distortGlyph(glyph: GlyphContours, params: Params, rng: RNG): GlyphContours {
  if (!glyph.length) return [];
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const c of glyph) {
    for (const p of c) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
  }
  const center = { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2 };
  return glyph.map((c) => distortContour(c, params, rng, center));
}
