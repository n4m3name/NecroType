// Whole-logo transform stage. Applied AFTER per-glyph distortion, BEFORE bbox + extrusion.
// Order: scale Y → skew X → perspective → wave. All anchored on the logo center.

import type { GlyphContours, Params } from "../types";

export function applyGlobalTransform(distorted: GlyphContours[], params: Params): void {
  const { skewX, scaleY, persp, waveAmp, waveFreq, twistAmp, twistFreq } = params;
  // Fast-out if everything is at identity / no-op
  if (skewX === 0 && scaleY === 1 && persp === 0 && waveAmp === 0 && twistAmp === 0) return;

  // Logo bbox center for anchoring
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const g of distorted) {
    for (const c of g) {
      for (const p of c) {
        if (p.x < xMin) xMin = p.x;
        if (p.x > xMax) xMax = p.x;
        if (p.y < yMin) yMin = p.y;
        if (p.y > yMax) yMax = p.y;
      }
    }
  }
  if (!isFinite(xMin)) return;

  const cx = (xMin + xMax) / 2;
  const cy = (yMin + yMax) / 2;
  const halfH = Math.max((yMax - yMin) / 2, 1);

  for (const g of distorted) {
    for (const c of g) {
      for (const p of c) {
        // Stretch Y around center
        const ny0 = cy + (p.y - cy) * scaleY;
        // Italic skew (X-shear) anchored at vertical center
        let nx = p.x + skewX * (ny0 - cy);
        let ny = ny0;
        // Perspective: x compresses or expands based on relative y-position
        if (persp !== 0) {
          const yFrac = (ny - cy) / (halfH * (scaleY || 1));
          nx = cx + (nx - cx) * (1 + persp * yFrac);
        }
        // Wave: sinusoidal Y as a function of X
        if (waveAmp !== 0) ny += waveAmp * Math.sin(nx * waveFreq);
        // Twist: sinusoidal rotation around the logo center; angle oscillates with X.
        // theta(x) = twistAmp * sin(x * twistFreq). Same parameter shape as wave.
        if (twistAmp !== 0) {
          const theta = twistAmp * Math.sin(nx * twistFreq);
          const cs = Math.cos(theta);
          const sn = Math.sin(theta);
          const tdx = nx - cx;
          const tdy = ny - cy;
          nx = cx + tdx * cs - tdy * sn;
          ny = cy + tdx * sn + tdy * cs;
        }
        p.x = nx;
        p.y = ny;
      }
    }
  }
}
