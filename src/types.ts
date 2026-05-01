// Shared types used across the algorithm modules and the React layer.

export interface Point {
  x: number;
  y: number;
}

/** A polyline is a sequence of points; closed shapes repeat the first point at the end. */
export type Polyline = Point[];

/** A glyph is a list of contours (outer outline + any holes). */
export type GlyphContours = Polyline[];

/** A single rendered tendril segment. `glyphIdx` ties tendrils to their parent glyph
 *  so that a tendril doesn't reject crossing its own root contour. */
export interface Segment {
  a: Point;
  b: Point;
  width: number;
  glyphIdx?: number;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What `generate()` produces; consumed by both renderers. */
export interface RenderData {
  distortedGlyphs: GlyphContours[];
  tendrils: Segment[];
  viewBox: ViewBox;
}

/** Every UI parameter that drives the algorithm. */
export interface Params {
  text: string;
  fontUrl: string;

  // Per-glyph distortion
  affine: number;
  vnoise: number;
  vfreq: number;

  // Global transform (whole logo)
  skewX: number;
  scaleY: number;
  persp: number;
  waveAmp: number;
  waveFreq: number;
  twistAmp: number;
  twistFreq: number;

  // Extrusion
  passes: number;
  roots: number;
  angle: number;
  length: number;
  branch: number;
  curl: number;
  symmetry: number;
  direction: number;
  overlap: number;

  // Render
  stroke: number;
  firstPassBoost: number;
  taper: number;

  // RNG
  seed: number;

  // Internal: arclength step for resampling glyph contours
  resampleStep: number;
}

export interface RenderResult {
  data: RenderData;
  segCount: number;
  durationMs: number;
  partial: boolean;
}
