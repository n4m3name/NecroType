// Glyph extraction via opentype.js. Returns one array of polyline contours per character.
//
// We deliberately AVOID `font.getPath(text, ...)` and `font.stringToGlyphs(text)` because
// both run text through Bidi + GSUB feature lookups, and opentype.js v1.3.5 throws on certain
// substitution formats (e.g., lookupType: 6, substFormat: 2) that fonts like Oswald and
// Black Ops One use for ccmp / contextual substitution. Instead we walk character-by-character
// using `charToGlyphIndex` + `glyphs.get`, which goes straight to the glyph table.
//
// Side effect: kerning + ligatures + advanced shaping are skipped. For ASCII band-name text
// this is essentially lossless.

import * as opentype from "opentype.js";
import type { Font } from "opentype.js";
import type { GlyphContours, Point, Polyline } from "../types";
import { dist } from "./geometry";
import { flattenCubic, flattenQuad } from "./bezier";

const FLATTEN_TOL = 0.4;
const FONT_SIZE = 220;

/** Convert a Path object's commands into a list of closed polyline contours. */
function pathToContours(path: { commands: ReadonlyArray<{ type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }> }): Polyline[] {
  const contours: Polyline[] = [];
  let current: Point[] | null = null;
  let pen: Point | null = null;
  for (const cmd of path.commands) {
    if (cmd.type === "M") {
      if (current && current.length > 1) contours.push(current);
      current = [{ x: cmd.x!, y: cmd.y! }];
      pen = { x: cmd.x!, y: cmd.y! };
    } else if (cmd.type === "L") {
      current!.push({ x: cmd.x!, y: cmd.y! });
      pen = { x: cmd.x!, y: cmd.y! };
    } else if (cmd.type === "C") {
      const out: Point[] = [];
      flattenCubic(
        pen!,
        { x: cmd.x1!, y: cmd.y1! },
        { x: cmd.x2!, y: cmd.y2! },
        { x: cmd.x!, y: cmd.y! },
        FLATTEN_TOL, 0, out,
      );
      for (const p of out) current!.push(p);
      pen = { x: cmd.x!, y: cmd.y! };
    } else if (cmd.type === "Q") {
      const out: Point[] = [];
      flattenQuad(
        pen!,
        { x: cmd.x1!, y: cmd.y1! },
        { x: cmd.x!, y: cmd.y! },
        FLATTEN_TOL, 0, out,
      );
      for (const p of out) current!.push(p);
      pen = { x: cmd.x!, y: cmd.y! };
    } else if (cmd.type === "Z") {
      if (current && current.length > 1) {
        if (dist(current[0], current[current.length - 1]) > 0.001) {
          current.push({ x: current[0].x, y: current[0].y });
        }
        contours.push(current);
      }
      current = null;
    }
  }
  if (current && current.length > 1) contours.push(current);
  return contours;
}

export function extractGlyphs(font: Font, text: string, fontSize: number = FONT_SIZE): GlyphContours[] {
  const scale = fontSize / font.unitsPerEm;
  const result: GlyphContours[] = [];
  let pen = 0;
  for (const ch of text) {
    const idx = font.charToGlyphIndex(ch);
    const glyph = font.glyphs.get(idx);
    if (!glyph) {
      // Unmapped char — skip with an em-width gap so layout doesn't collapse
      pen += (font.unitsPerEm || 1000) * scale * 0.5;
      result.push([]);
      continue;
    }
    const glyphPath = glyph.getPath(pen, 0, fontSize);
    result.push(pathToContours(glyphPath));
    pen += (glyph.advanceWidth || 0) * scale;
  }
  return result;
}

// ---------- Cache: keep extracted glyphs across renders that don't change text/font/size.
let _cache: GlyphContours[] | null = null;
let _cacheKey: string | null = null;

export function getCachedGlyphs(font: Font, text: string, fontUrl: string, fontSize: number = FONT_SIZE): GlyphContours[] {
  const k = fontUrl + "::" + text + "::" + fontSize;
  if (_cacheKey !== k || !_cache) {
    _cache = extractGlyphs(font, text, fontSize);
    _cacheKey = k;
  }
  // Deep clone so distortion can mutate freely without poisoning cache
  return _cache.map((g) => g.map((c) => c.map((p) => ({ x: p.x, y: p.y }))));
}

export function invalidateGlyphCache(): void {
  _cache = null;
  _cacheKey = null;
}

/** Async font loader. Fetches the binary and parses it. */
export async function loadFontFromUrl(url: string): Promise<Font> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  const buf = await res.arrayBuffer();
  return opentype.parse(buf);
}

/** Synchronous parse from an ArrayBuffer (for user-uploaded files). */
export function parseFontFromBuffer(buffer: ArrayBuffer): Font {
  return opentype.parse(buffer);
}

export const FONT_RENDER_SIZE = FONT_SIZE;
