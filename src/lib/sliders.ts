// Single source of truth for slider definitions. Everything that needs to know about
// param ranges (Randomize all, I'm feeling heavy, reset buttons, the UI itself) reads
// from this list.

import type { Params } from "../types";
import { DEFAULT_FONT_URL } from "./fonts";

export interface SliderDef {
  id: keyof Params;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** Optional grouping; matches a Section in the UI. */
  section: SectionId;
}

export type SectionId =
  | "glyph-distortion"
  | "global-transform"
  | "extrusion"
  | "render";

export const SLIDERS: SliderDef[] = [
  // Per-glyph distortion
  { id: "affine",   label: "Affine sigma",       min: 0,    max: 0.3,   step: 0.01,  default: 0.08,  section: "glyph-distortion" },
  { id: "vnoise",   label: "Vertex noise (px)",  min: 0,    max: 20,    step: 0.5,   default: 6,     section: "glyph-distortion" },
  { id: "vfreq",    label: "Noise frequency",    min: 0.005,max: 0.1,   step: 0.005, default: 0.025, section: "glyph-distortion" },

  // Global transform
  { id: "skewX",    label: "Italic skew (X-shear)", min: -0.5, max: 0.5, step: 0.02, default: 0,    section: "global-transform" },
  { id: "scaleY",   label: "Vertical stretch",      min: 0.5,  max: 2.5, step: 0.05, default: 1,    section: "global-transform" },
  { id: "persp",    label: "Perspective tilt",      min: -0.4, max: 0.4, step: 0.02, default: 0,    section: "global-transform" },
  { id: "waveAmp",  label: "Wave amplitude (px)",   min: 0,    max: 30,  step: 1,    default: 0,    section: "global-transform" },
  { id: "waveFreq", label: "Wave frequency",        min: 0.005,max: 0.06,step: 0.005,default: 0.02, section: "global-transform" },
  { id: "twistAmp", label: "Twist amplitude (rad)", min: -1,    max: 1,   step: 0.05,  default: 0,    section: "global-transform" },
  { id: "twistFreq",label: "Twist frequency",       min: 0.005, max: 0.06,step: 0.005, default: 0.02, section: "global-transform" },

  // Extrusion
  { id: "passes",    label: "Extrusion passes",  min: 0,    max: 4,    step: 1,     default: 2,    section: "extrusion" },
  { id: "roots",     label: "Roots per glyph",   min: 0,    max: 60,   step: 1,     default: 12,   section: "extrusion" },
  { id: "angle",     label: "Angle sigma (deg)", min: 0,    max: 80,   step: 1,     default: 25,   section: "extrusion" },
  { id: "length",    label: "Mean tendril length (px)", min: 5, max: 500, step: 1, default: 40,   section: "extrusion" },
  { id: "branch",    label: "Branch probability",min: 0,    max: 0.3,  step: 0.005, default: 0.04, section: "extrusion" },
  { id: "curl",      label: "Curl (per step, rad)", min: 0, max: 1,    step: 0.01,  default: 0.18, section: "extrusion" },
  { id: "symmetry",  label: "Symmetry (mirror left↔right)", min: 0, max: 1, step: 0.05, default: 0.5, section: "extrusion" },
  { id: "direction", label: "Directionality (top↑ / bottom↓, pass 1)", min: 0, max: 1, step: 0.05, default: 0.4, section: "extrusion" },
  { id: "overlap",   label: "Overlap (0 = no crossings, 1 = free)", min: 0, max: 1, step: 0.05, default: 1, section: "extrusion" },

  // Render
  { id: "stroke",         label: "Stroke width (px) — base; later passes decay × 0.55", min: 0.3, max: 30, step: 0.1, default: 2.5, section: "render" },
  { id: "firstPassBoost", label: "First-pass thickness boost",                          min: 1,   max: 5,  step: 0.1, default: 1,   section: "render" },
  { id: "taper",          label: "Taper (tip pointiness)",                              min: 0,   max: 1,  step: 0.05, default: 0.85, section: "render" },
];

export const SECTION_ORDER: { id: SectionId; label: string; resettable: boolean }[] = [
  { id: "glyph-distortion", label: "distortion", resettable: true },
  { id: "global-transform", label: "transform",  resettable: true },
  { id: "extrusion",        label: "extrusion",  resettable: false },
  { id: "render",           label: "render",     resettable: false },
];

export function defaultParams(): Params {
  const p: Partial<Params> = {
    text: "NECROTYPE",
    fontUrl: DEFAULT_FONT_URL,
    seed: 42,
    resampleStep: 2.5,
    dark: true,
  };
  for (const s of SLIDERS) {
    (p as Record<string, number>)[s.id as string] = s.default;
  }
  return p as Params;
}

/** Round a value to a slider's step + clamp to its range. */
export function snapToStep(s: SliderDef, v: number): number {
  let x = Math.max(s.min, Math.min(s.max, v));
  x = Math.round(x / s.step) * s.step;
  // Trim float noise via toFixed → number conversion using the step's decimal count
  const decimals = (s.step.toString().split(".")[1] || "").length;
  return Number(x.toFixed(decimals));
}

export function findSlider(id: keyof Params): SliderDef | undefined {
  return SLIDERS.find((s) => s.id === id);
}

/** Sliders for a given section. */
export function slidersInSection(section: SectionId): SliderDef[] {
  return SLIDERS.filter((s) => s.section === section);
}
