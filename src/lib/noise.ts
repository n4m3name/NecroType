// Smooth value noise (cheap Perlin-ish). Used for per-vertex displacement during distortion.

function hash2(x: number, y: number, seed: number): number {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1274126177;
  n = ((n ^ (n >>> 13)) * 1274126177) | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Returns a value in [0, 1) that's spatially smooth (smoothstepped between hashes). */
export function noise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const v00 = hash2(x0,     y0,     seed);
  const v10 = hash2(x0 + 1, y0,     seed);
  const v01 = hash2(x0,     y0 + 1, seed);
  const v11 = hash2(x0 + 1, y0 + 1, seed);
  const a = v00 * (1 - sx) + v10 * sx;
  const b = v01 * (1 - sx) + v11 * sx;
  return a * (1 - sy) + b * sy;
}

/** Centered noise in [-1, 1). */
export function snoise2D(x: number, y: number, seed: number): number {
  return noise2D(x, y, seed) * 2 - 1;
}
