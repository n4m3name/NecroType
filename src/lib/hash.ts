// Spatial hash. Used for the overlap check during tendril growth: each placed segment
// is inserted into the cells it passes through, and new candidate segments query nearby
// cells to test for crossings.

import type { Segment } from "../types";

export interface SpatialHash {
  cellSize: number;
  cells: Map<string, Segment[]>;
}

export function makeSpatialHash(cellSize: number): SpatialHash {
  return { cellSize, cells: new Map() };
}

function key(h: SpatialHash, x: number, y: number): string {
  return Math.floor(x / h.cellSize) + "," + Math.floor(y / h.cellSize);
}

function cellsFor(h: SpatialHash, ax: number, ay: number, bx: number, by: number): Set<string> {
  const len = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(2, Math.ceil(len / (h.cellSize * 0.5)) + 1);
  const out = new Set<string>();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.add(key(h, ax + (bx - ax) * t, ay + (by - ay) * t));
  }
  return out;
}

export function hashInsert(h: SpatialHash, seg: Segment): void {
  for (const k of cellsFor(h, seg.a.x, seg.a.y, seg.b.x, seg.b.y)) {
    let arr = h.cells.get(k);
    if (!arr) {
      arr = [];
      h.cells.set(k, arr);
    }
    arr.push(seg);
  }
}

/** Return all segments that share at least one cell with the given query segment. */
export function hashNearby(h: SpatialHash, ax: number, ay: number, bx: number, by: number): Segment[] {
  const out: Segment[] = [];
  const seen = new Set<Segment>();
  for (const k of cellsFor(h, ax, ay, bx, by)) {
    const arr = h.cells.get(k);
    if (!arr) continue;
    for (const s of arr) {
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}
