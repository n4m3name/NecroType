// Time budget shared by the pipeline. Inner loops poll `overBudget()` and bail early.
// Without this, high-branch + low-overlap combos can grind the main thread to a halt.

let _start = 0;
let _ms = 0;
let _hit = false;

export function startBudget(ms: number): void {
  _start = performance.now();
  _ms = ms;
  _hit = false;
}

export function overBudget(): boolean {
  if (_hit) return true;
  if (performance.now() - _start > _ms) {
    _hit = true;
    return true;
  }
  return false;
}

export function budgetWasHit(): boolean {
  return _hit;
}
