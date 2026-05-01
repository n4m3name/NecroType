import type { Point, Polyline } from "../types";

export const mid = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export const dist = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export function rotate(v: Point, theta: number): Point {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

export function normalize(v: Point): Point {
  const m = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / m, y: v.y / m };
}

/** Resample a polyline at uniform arclength. Output preserves endpoints. */
export function resample(poly: Polyline, step: number): Polyline {
  if (poly.length < 2) return poly.slice();
  const out: Point[] = [poly[0]];
  let prev = poly[0];
  let acc = 0;
  for (let i = 1; i < poly.length; i++) {
    const cur = poly[i];
    let segLen = dist(prev, cur);
    while (acc + segLen >= step) {
      const t = (step - acc) / segLen;
      const np: Point = {
        x: prev.x + (cur.x - prev.x) * t,
        y: prev.y + (cur.y - prev.y) * t,
      };
      out.push(np);
      prev = np;
      segLen = dist(prev, cur);
      acc = 0;
    }
    acc += segLen;
    prev = cur;
  }
  return out;
}

/** Shoelace signed area. Used to determine winding (sign depends on coord convention). */
export function signedArea(poly: Polyline): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

/** True if segments (a1,a2) and (b1,b2) cross strictly (no shared endpoints). */
export function segsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const denom = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
  if (Math.abs(denom) < 1e-9) return false;
  const ua = ((b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)) / denom;
  const ub = ((a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)) / denom;
  return ua > 0.001 && ua < 0.999 && ub > 0.001 && ub < 0.999;
}

/** Distance from a point to a segment (clamped). */
export function pointToSegDist(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return Math.hypot(px - a.x, py - a.y);
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const cx = a.x + dx * t;
  const cy = a.y + dy * t;
  return Math.hypot(px - cx, py - cy);
}
