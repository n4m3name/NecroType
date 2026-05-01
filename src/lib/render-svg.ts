// SVG export. Always flat: a single <path> element, fill-rule nonzero. The result imports
// into vector editors (Illustrator, Inkscape) as ONE editable shape — what you'd actually
// want when manipulating a logo downstream. Tendril strokes are converted to filled
// rectangles aligned with each segment.

import type { Params, Polyline, RenderData } from "../types";

function pathFromContour(c: Polyline): string {
  if (!c.length) return "";
  let s = `M${c[0].x.toFixed(2)},${c[0].y.toFixed(2)}`;
  for (let i = 1; i < c.length; i++) {
    s += `L${c[i].x.toFixed(2)},${c[i].y.toFixed(2)}`;
  }
  s += "Z";
  return s;
}

export function renderSVG(data: RenderData, params: Params): string {
  const vb = data.viewBox;
  let d = "";

  // Glyph contours: closed polygons.
  for (const g of data.distortedGlyphs) {
    for (const c of g) d += pathFromContour(c);
  }

  // Tendril segments: each becomes a 4-point filled rectangle perpendicular to its direction.
  // Round line caps approximate to flat — at typical stroke widths the visual delta is small,
  // and the simpler geometry means cleaner output for downstream editing.
  for (const seg of data.tendrils) {
    const w = params.stroke * seg.width;
    if (w < 0.01) continue;
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const half = w / 2;
    const nx = (-dy / len) * half;
    const ny = (dx / len) * half;
    d +=
      `M${(seg.a.x + nx).toFixed(2)},${(seg.a.y + ny).toFixed(2)}` +
      `L${(seg.b.x + nx).toFixed(2)},${(seg.b.y + ny).toFixed(2)}` +
      `L${(seg.b.x - nx).toFixed(2)},${(seg.b.y - ny).toFixed(2)}` +
      `L${(seg.a.x - nx).toFixed(2)},${(seg.a.y - ny).toFixed(2)}Z`;
  }

  const fill = params.dark ? "#fff" : "#000";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}"><path d="${d}" fill="${fill}" fill-rule="nonzero"/></svg>`;
}
