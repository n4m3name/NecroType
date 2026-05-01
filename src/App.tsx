// Top-level container: owns params + font state, wires the control panel and preview canvas.
// Most logic lives in the lib/ modules and the hooks; App just glues them together.

import { useEffect, useRef, useState } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { useFontLoader } from "./hooks/useFontLoader";
import { useRenderPipeline } from "./hooks/useRenderPipeline";
import { useCanvasResize } from "./hooks/useCanvasResize";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { defaultParams } from "./lib/sliders";
import {
  feelHeavy,
  randomizeAll,
  resetGlobalTransform,
  resetGlyphDistortion,
} from "./lib/randomize";
import { renderSVG } from "./lib/render-svg";
import { renderPNGBlob } from "./lib/render-canvas";
import type { Params } from "./types";

export default function App() {
  // Initial state runs through feelHeavy so first paint is something interesting
  // instead of the deterministic seed-42 default.
  const [params, setParams] = useState<Params>(() => feelHeavy(defaultParams()));
  const fontLoader = useFontLoader(params.fontUrl);

  // When the font dropdown changes, fire off a load.
  useEffect(() => {
    if (fontLoader.fontUrl !== params.fontUrl && !params.fontUrl.startsWith("upload:")) {
      fontLoader.loadUrl(params.fontUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.fontUrl]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pipeline = useRenderPipeline(canvasRef, params, fontLoader.font);
  useCanvasResize(pipeline.redraw);

  const setParam = <K extends keyof Params>(key: K, value: Params[K]) => {
    setParams((p) => ({ ...p, [key]: value }));
  };

  const handleFontFile = (file: File) => {
    fontLoader.loadFile(file);
    setParams((p) => ({ ...p, fontUrl: `upload:${file.name}` }));
  };

  const handleReroll = () => {
    setParams((p) => ({ ...p, seed: (Math.random() * 1e9) | 0 }));
  };

  const handleRandomize = () => {
    setParams((p) => randomizeAll(p));
  };

  const handleHeavy = () => {
    setParams((p) => feelHeavy(p));
  };

  const handleResetGlobal = () => {
    setParams((p) => resetGlobalTransform(p));
  };

  const handleResetGlyph = () => {
    setParams((p) => resetGlyphDistortion(p));
  };

  const downloadBlob = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(params.text || "necrotype").replace(/\s+/g, "_")}-${params.seed}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSVG = () => {
    pipeline.forceFull();
    const last = pipeline.getLastFullData();
    if (!last) return;
    const svg = renderSVG(last.data, last.params);
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "svg");
  };

  const handleDownloadPNG = async () => {
    pipeline.forceFull();
    const last = pipeline.getLastFullData();
    if (!last) return;
    try {
      const blob = await renderPNGBlob(last.data, last.params, 3000);
      downloadBlob(blob, "png");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("PNG export failed:", err);
    }
  };

  // Status string for the panel. Errors take priority over success metrics so a failed
  // font (Oswald, Black Ops One, anything opentype.js can't parse) shows clearly.
  let status = "";
  if (fontLoader.error) {
    status = fontLoader.error;
  } else if (pipeline.error) {
    status = pipeline.error;
  } else if (pipeline.status) {
    const s = pipeline.status;
    const tag = s.partial ? " (partial — drop branch / overlap)" : "";
    status = `${params.text.length} chars · ${s.segCount} segs · seed ${params.seed} · ${s.durationMs.toFixed(0)}ms${tag}`;
  } else if (fontLoader.loading) {
    status = "loading font…";
  }

  // Loading overlay shows during font load OR a font-load error
  const overlayVisible = fontLoader.loading || !!fontLoader.error;
  const overlayMessage = fontLoader.error ? "load failed" : "loading";

  // Phone-mode is intentionally STRICT: must be both narrow AND a touch device.
  // Plain narrow (i3 screen-split, narrow desktop window) does not trigger phone mode.
  const isPhone = useMediaQuery("(max-width: 600px) and (pointer: coarse)");

  const panel = (
    <ControlPanel
      params={params}
      onParamChange={setParam}
      onFontFile={handleFontFile}
      onResetGlobalTransform={handleResetGlobal}
      onResetGlyphDistortion={handleResetGlyph}
      onReroll={handleReroll}
      onRandomizeAll={handleRandomize}
      onFeelHeavy={handleHeavy}
      onDownloadSVG={handleDownloadSVG}
      onDownloadPNG={handleDownloadPNG}
      status={status}
      isPhone={isPhone}
    />
  );

  const canvas = (
    <PreviewCanvas
      ref={canvasRef}
      loading={overlayVisible}
      loadingMessage={overlayMessage}
      errored={!!fontLoader.error}
      dark={params.dark}
    />
  );

  return isPhone ? (
    <div className="flex flex-col h-screen">
      {canvas}
      {panel}
    </div>
  ) : (
    <div className="flex flex-row h-screen">
      {panel}
      {canvas}
    </div>
  );
}
