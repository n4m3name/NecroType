// Live preview renderer. Canvas2D, raster, fast.
// Bins tendril segments by width to amortize lineWidth changes; chains adjacent segments
// inside each bin so rounded line caps only appear at real tendril endpoints, not at every
// segment boundary.

import type { Params, RenderData, Segment } from "../types";

export const NUM_WIDTH_BINS = 12;

export function binTendrils(tendrils: Segment[]): Segment[][] {
  const bins: Segment[][] = new Array(NUM_WIDTH_BINS);
  for (let i = 0; i < NUM_WIDTH_BINS; i++) bins[i] = [];
  for (const s of tendrils) {
    let bi = Math.floor(s.width * NUM_WIDTH_BINS);
    if (bi < 0) bi = 0;
    else if (bi >= NUM_WIDTH_BINS) bi = NUM_WIDTH_BINS - 1;
    bins[bi].push(s);
  }
  return bins;
}

export function renderCanvas(data: RenderData, canvas: HTMLCanvasElement, params: Params): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(rect.width, 1);
  const cssH = Math.max(rect.height, 1);
  const bw = Math.floor(cssW * dpr);
  const bh = Math.floor(cssH * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const bg = params.dark ? "#000000" : "#ffffff";
  const ink = params.dark ? "#ffffff" : "#000000";
  // Reset to identity, fill background in pixel coords
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, bw, bh);

  // Aspect-fit (letterbox)
  const vb = data.viewBox;
  const scale = Math.min(cssW / vb.w, cssH / vb.h);
  const drawW = vb.w * scale;
  const drawH = vb.h * scale;
  const offX = (cssW - drawW) / 2;
  const offY = (cssH - drawH) / 2;
  ctx.setTransform(
    dpr * scale, 0,
    0, dpr * scale,
    dpr * (offX - vb.x * scale),
    dpr * (offY - vb.y * scale),
  );

  // Tendrils first (glyph fills cover them)
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ink;
  const bins = binTendrils(data.tendrils);
  const EPS = 0.05;
  for (let i = 0; i < NUM_WIDTH_BINS; i++) {
    const bin = bins[i];
    if (!bin.length) continue;
    ctx.lineWidth = (params.stroke * (i + 0.5)) / NUM_WIDTH_BINS;
    ctx.beginPath();
    let prevX = NaN;
    let prevY = NaN;
    for (let k = 0; k < bin.length; k++) {
      const s = bin[k];
      if (Math.abs(s.a.x - prevX) < EPS && Math.abs(s.a.y - prevY) < EPS) {
        ctx.lineTo(s.b.x, s.b.y);
      } else {
        ctx.moveTo(s.a.x, s.a.y);
        ctx.lineTo(s.b.x, s.b.y);
      }
      prevX = s.b.x;
      prevY = s.b.y;
    }
    ctx.stroke();
  }

  // Glyphs (filled, even-odd to handle holes)
  ctx.fillStyle = ink;
  const path2d = new Path2D();
  for (const g of data.distortedGlyphs) {
    for (const c of g) {
      if (c.length < 2) continue;
      path2d.moveTo(c[0].x, c[0].y);
      for (let i = 1; i < c.length; i++) path2d.lineTo(c[i].x, c[i].y);
      path2d.closePath();
    }
  }
  // nonzero (default) so overlapping letters stay filled. Letter holes still work because
  // TrueType winds inner contours opposite to outer contours, so they cancel.
  ctx.fill(path2d, "nonzero");
}

/** Render the data to an offscreen canvas at a fixed pixel width and return a transparent
 *  PNG blob. Background stays transparent so the PNG drops into anything as a logo asset. */
export function renderPNGBlob(data: RenderData, params: Params, pixelWidth: number): Promise<Blob> {
  const vb = data.viewBox;
  const aspect = vb.h / vb.w;
  const width = Math.max(1, Math.floor(pixelWidth));
  const height = Math.max(1, Math.round(width * aspect));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("could not acquire 2d context"));

  const scale = Math.min(width / vb.w, height / vb.h);
  const drawW = vb.w * scale;
  const drawH = vb.h * scale;
  const offX = (width - drawW) / 2;
  const offY = (height - drawH) / 2;
  ctx.setTransform(scale, 0, 0, scale, offX - vb.x * scale, offY - vb.y * scale);

  const ink = params.dark ? "#ffffff" : "#000000";

  // Tendrils. Same chain detection as the live renderer.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ink;
  const bins = binTendrils(data.tendrils);
  const EPS = 0.05;
  for (let i = 0; i < NUM_WIDTH_BINS; i++) {
    const bin = bins[i];
    if (!bin.length) continue;
    ctx.lineWidth = (params.stroke * (i + 0.5)) / NUM_WIDTH_BINS;
    ctx.beginPath();
    let prevX = NaN;
    let prevY = NaN;
    for (let k = 0; k < bin.length; k++) {
      const s = bin[k];
      if (Math.abs(s.a.x - prevX) < EPS && Math.abs(s.a.y - prevY) < EPS) {
        ctx.lineTo(s.b.x, s.b.y);
      } else {
        ctx.moveTo(s.a.x, s.a.y);
        ctx.lineTo(s.b.x, s.b.y);
      }
      prevX = s.b.x;
      prevY = s.b.y;
    }
    ctx.stroke();
  }

  // Glyphs. PNG keeps a transparent background regardless of dark mode so the asset
  // drops cleanly onto any surface; only the ink color flips.
  ctx.fillStyle = ink;
  const path2d = new Path2D();
  for (const g of data.distortedGlyphs) {
    for (const c of g) {
      if (c.length < 2) continue;
      path2d.moveTo(c[0].x, c[0].y);
      for (let i = 1; i < c.length; i++) path2d.lineTo(c[i].x, c[i].y);
      path2d.closePath();
    }
  }
  ctx.fill(path2d, "nonzero");

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG encoding failed"));
    }, "image/png");
  });
}
