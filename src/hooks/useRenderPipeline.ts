// Single-tier render strategy: only ever runs the full pipeline. While the user is dragging
// a slider, the canvas shows the LAST completed render (no visual change) — 250 ms after the
// most recent input the new full render lands. This avoids the previous "fast preview"
// approach that produced a visibly-different image during drag because it skipped the overlap
// check (the biggest perf hog) and let tendrils grow through everything.
//
// Trade-off: drag gives no live preview on the canvas. Status bar still updates so the
// feedback is "compute is happening, here's how long the last one took". For heavy params
// the full render can take a few hundred ms; that latency is now visible instead of being
// hidden behind a misleading fast version.

import { useEffect, useRef, useState } from "react";
import type { Font } from "opentype.js";
import type { Params, RenderResult } from "../types";
import { generate } from "../lib/pipeline";
import { renderCanvas } from "../lib/render-canvas";

export interface PipelineStatus {
  segCount: number;
  durationMs: number;
  partial: boolean;
}

export interface PipelineApi {
  status: PipelineStatus | null;
  /** If the most recent render attempt threw, this holds the message. */
  error: string | null;
  /** Last full render data + params, used by the SVG download button. */
  getLastFullData: () => { data: RenderResult["data"]; params: Params } | null;
  /** Force a full render right now (synchronous). */
  forceFull: () => void;
  /** Redraw canvas from cached data without re-running the pipeline. Used by resize. */
  redraw: () => void;
}

const IDLE_FULL_MS = 250;

export function useRenderPipeline(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  params: Params,
  font: Font | null,
): PipelineApi {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const idleTimer = useRef<number | null>(null);
  const lastFull = useRef<{ data: RenderResult["data"]; params: Params } | null>(null);

  // Track the most recent params so timers/explicit triggers see fresh values.
  const paramsRef = useRef(params);
  const fontRef = useRef(font);
  paramsRef.current = params;
  fontRef.current = font;

  // Detect font change so we can render immediately rather than waiting through the debounce
  // (otherwise the canvas would show the OLD font for 250 ms after the new one loaded).
  const prevFontRef = useRef<Font | null>(null);

  const runFull = () => {
    const canvas = canvasRef.current;
    const f = fontRef.current;
    if (!canvas || !f) return;
    const p = paramsRef.current;
    try {
      const result = generate(f, p, { fast: false });
      renderCanvas(result.data, canvas, p);
      lastFull.current = { data: result.data, params: { ...p } };
      setStatus({
        segCount: result.segCount,
        durationMs: result.durationMs,
        partial: result.partial,
      });
      // Clear any prior error on a successful render
      setError((prev) => (prev === null ? prev : null));
    } catch (err: unknown) {
      // Pipeline blew up (likely a font that opentype.js or our extractor can't handle).
      // Don't update the canvas — keep showing the last good render. Just surface the error
      // to the status bar so the user can pick a different font without the app dying.
      const message = err instanceof Error ? err.message : String(err);
      setError(`render failed: ${message}`);
      // Best-effort log so the dev console still has a stack
      // eslint-disable-next-line no-console
      console.error("NecroType render error:", err);
    }
  };

  useEffect(() => {
    if (!font) return;

    const fontChanged = prevFontRef.current !== font;
    prevFontRef.current = font;

    // Render immediately when:
    //  - font (re)loaded, so we don't show old font / blank canvas
    //  - first render after mount (no cached data)
    if (fontChanged || !lastFull.current) {
      runFull();
      return;
    }

    // Debounced full render for slider / param changes
    if (idleTimer.current !== null) {
      window.clearTimeout(idleTimer.current);
    }
    idleTimer.current = window.setTimeout(() => {
      idleTimer.current = null;
      runFull();
    }, IDLE_FULL_MS);

    return () => {
      if (idleTimer.current !== null) {
        window.clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, font]);

  const forceFull = () => {
    if (idleTimer.current !== null) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    runFull();
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    const last = lastFull.current;
    if (!canvas || !last) return;
    renderCanvas(last.data, canvas, last.params);
  };

  return {
    status,
    error,
    getLastFullData: () => lastFull.current,
    forceFull,
    redraw,
  };
}
