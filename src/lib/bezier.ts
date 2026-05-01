import type { Point } from "../types";
import { mid } from "./geometry";

/** Adaptively flatten a cubic Bezier into a polyline. Output is appended to `out`. */
export function flattenCubic(
  p0: Point, p1: Point, p2: Point, p3: Point,
  tol: number, depth: number, out: Point[],
): void {
  if (depth > 10) {
    out.push(p3);
    return;
  }
  // Distance of control points from the chord p0->p3
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const c1 = Math.abs((p1.x - p0.x) * dy - (p1.y - p0.y) * dx) / len;
  const c2 = Math.abs((p2.x - p0.x) * dy - (p2.y - p0.y) * dx) / len;
  if (c1 < tol && c2 < tol) {
    out.push(p3);
    return;
  }
  const m1 = mid(p0, p1);
  const m2 = mid(p1, p2);
  const m3 = mid(p2, p3);
  const m12 = mid(m1, m2);
  const m23 = mid(m2, m3);
  const m = mid(m12, m23);
  flattenCubic(p0, m1, m12, m, tol, depth + 1, out);
  flattenCubic(m, m23, m3, p3, tol, depth + 1, out);
}

/** Adaptively flatten a quadratic Bezier into a polyline. Output is appended to `out`. */
export function flattenQuad(
  p0: Point, p1: Point, p2: Point,
  tol: number, depth: number, out: Point[],
): void {
  if (depth > 10) {
    out.push(p2);
    return;
  }
  const dx = p2.x - p0.x;
  const dy = p2.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const c1 = Math.abs((p1.x - p0.x) * dy - (p1.y - p0.y) * dx) / len;
  if (c1 < tol) {
    out.push(p2);
    return;
  }
  const m1 = mid(p0, p1);
  const m2 = mid(p1, p2);
  const m = mid(m1, m2);
  flattenQuad(p0, m1, m, tol, depth + 1, out);
  flattenQuad(m, m2, p2, tol, depth + 1, out);
}
