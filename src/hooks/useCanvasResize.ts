// Debounced window-resize handler that calls back with no args.
// Used to redraw the canvas at the new size without re-running the pipeline.

import { useEffect } from "react";

const DEBOUNCE_MS = 80;

export function useCanvasResize(redraw: () => void): void {
  useEffect(() => {
    let timer: number | null = null;
    const onResize = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        redraw();
      }, DEBOUNCE_MS);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timer !== null) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
