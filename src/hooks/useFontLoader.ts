// Font loading hook. Tracks the current font URL, the parsed Font instance, async
// loading state, and error messages. Invalidates the glyph cache whenever the font
// changes so the pipeline doesn't re-extract from stale geometry.

import { useEffect, useRef, useState } from "react";
import type { Font } from "opentype.js";
import { invalidateGlyphCache, loadFontFromUrl, parseFontFromBuffer } from "../lib/glyphs";

export interface FontLoaderState {
  font: Font | null;
  fontUrl: string | null;
  loading: boolean;
  error: string | null;
}

export interface FontLoaderApi extends FontLoaderState {
  /** Load from URL. Replaces current font. */
  loadUrl: (url: string) => void;
  /** Parse + load a user-uploaded font file. */
  loadFile: (file: File) => void;
}

export function useFontLoader(initialUrl: string): FontLoaderApi {
  const [state, setState] = useState<FontLoaderState>({
    font: null,
    fontUrl: null,
    loading: true,
    error: null,
  });
  // Track the most recent request so an out-of-order completion doesn't clobber a newer one
  const requestId = useRef(0);

  const loadUrl = (url: string) => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadFontFromUrl(url)
      .then((font) => {
        if (requestId.current !== id) return;
        invalidateGlyphCache();
        setState({ font, fontUrl: url, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (requestId.current !== id) return;
        const message = err instanceof Error ? err.message : String(err);
        setState((s) => ({ ...s, loading: false, error: `font load failed: ${message}` }));
      });
  };

  const loadFile = (file: File) => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    file.arrayBuffer()
      .then((buf) => {
        if (requestId.current !== id) return;
        try {
          const font = parseFontFromBuffer(buf);
          invalidateGlyphCache();
          setState({ font, fontUrl: `upload:${file.name}`, loading: false, error: null });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          setState((s) => ({ ...s, loading: false, error: `font parse failed: ${message}` }));
        }
      })
      .catch((err: unknown) => {
        if (requestId.current !== id) return;
        const message = err instanceof Error ? err.message : String(err);
        setState((s) => ({ ...s, loading: false, error: `file read failed: ${message}` }));
      });
  };

  // Initial load
  useEffect(() => {
    loadUrl(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, loadUrl, loadFile };
}
