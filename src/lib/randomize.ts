// Randomizers: full-random and the Note.txt-aware "I'm feeling heavy" preset.

import type { Params } from "../types";
import { FONTS } from "./fonts";
import { SLIDERS, snapToStep, findSlider } from "./sliders";

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
const choice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomFontUrl = (): string => FONTS[Math.floor(Math.random() * FONTS.length)].url;
const newSeed = (): number => (Math.random() * 1e9) | 0;

/** Uniform random over every slider's full range. Random font + seed. Text untouched. */
export function randomizeAll(prev: Params): Params {
  const next: Params = { ...prev };
  for (const s of SLIDERS) {
    (next as unknown as Record<string, number>)[s.id as string] = snapToStep(s, rand(s.min, s.max));
  }
  next.fontUrl = randomFontUrl();
  next.seed = newSeed();
  return next;
}

function setBy(prev: Params, id: keyof Params, v: number): Params {
  const def = findSlider(id);
  if (!def) return prev;
  (prev as unknown as Record<string, number>)[id as string] = snapToStep(def, v);
  return prev;
}

/** "I'm feeling heavy". Per Note.txt:
 *  - Per-glyph distortion + global transform fully randomized across full slider ranges
 *    (the file said these "do not matter" for the silhouette, but unconstrained warping
 *    layered on top of solid extrusion gives the "heavy" feel)
 *  - Extrusion sliders bounded to ranges Note.txt flags as "good"
 *  - Stroke pushed into the low-mid to upper-mid band
 *  - First-pass boost held at 1 (Note.txt: zero) */
export function feelHeavy(prev: Params): Params {
  const next: Params = { ...prev };

  // Per-glyph distortion + global transform: fully random across slider ranges,
  // EXCEPT twist (held at zero — twist + the other warps usually compounds into mush).
  const fullRange = ["affine", "vnoise", "vfreq", "skewX", "scaleY", "persp", "waveAmp", "waveFreq"] as const;
  for (const id of fullRange) {
    const s = findSlider(id);
    if (s) (next as unknown as Record<string, number>)[id] = snapToStep(s, rand(s.min, s.max));
  }
  setBy(next, "twistAmp", 0);
  setBy(next, "twistFreq", 0.02);

  // Extrusion shaping
  setBy(next, "passes", choice([1, 2]));
  setBy(next, "roots", rand(8, 20));
  setBy(next, "angle", rand(0, 80));
  setBy(next, "length", rand(40, 150));
  setBy(next, "branch", rand(0, 0.04));
  setBy(next, "curl", rand(0.4, 0.6));
  setBy(next, "symmetry", rand(0.7, 1.0));
  setBy(next, "direction", rand(0, 1));
  setBy(next, "overlap", rand(0, 0.3));

  // Render
  setBy(next, "stroke", rand(6, 22));
  setBy(next, "firstPassBoost", 1);
  setBy(next, "taper", rand(0.7, 1.0));

  next.fontUrl = randomFontUrl();
  next.seed = newSeed();
  return next;
}

/** Reset just the "global transform" sliders to their no-op defaults. */
export function resetGlobalTransform(prev: Params): Params {
  const next: Params = { ...prev };
  setBy(next, "skewX", 0);
  setBy(next, "scaleY", 1);
  setBy(next, "persp", 0);
  setBy(next, "waveAmp", 0);
  setBy(next, "waveFreq", 0.02);
  setBy(next, "twistAmp", 0);
  setBy(next, "twistFreq", 0.02);
  return next;
}

/** Reset just the "per-glyph distortion" sliders to clean zero. */
export function resetGlyphDistortion(prev: Params): Params {
  const next: Params = { ...prev };
  setBy(next, "affine", 0);
  setBy(next, "vnoise", 0);
  setBy(next, "vfreq", 0.025);
  return next;
}
