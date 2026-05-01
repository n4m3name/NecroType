// Deterministic RNG (sfc32) + a couple of distribution helpers.

export type RNG = () => number;

function sfc32(a: number, b: number, c: number, d: number): RNG {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = ((c << 21) | (c >>> 11));
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function makeRNG(seed: number): RNG {
  const s = seed | 0;
  return sfc32(
    0x9e3779b9 ^ s,
    0x243f6a88 ^ ((s * 2654435761) | 0),
    0xb7e15162 ^ ((s * 40503) | 0),
    s,
  );
}

/** Standard normal via Box-Muller. */
export function gauss(rng: RNG): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Exponential distribution with the given mean. */
export function expSample(rng: RNG, mean: number): number {
  return -Math.log(Math.max(rng(), 1e-9)) * mean;
}
