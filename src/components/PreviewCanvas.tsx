// The canvas + loading overlay, in a fixed-aspect wrapper.

import { forwardRef } from "react";
import { LoadingOverlay } from "./LoadingOverlay";

interface Props {
  loading: boolean;
  loadingMessage: string;
  errored?: boolean;
}

export const PreviewCanvas = forwardRef<HTMLCanvasElement, Props>(
  function PreviewCanvas({ loading, loadingMessage, errored }, ref) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 canvas-bg">
        <div
          className="relative w-full max-w-[1100px] bg-white border border-[var(--hairline)]"
          style={{ aspectRatio: "11 / 4" }}
        >
          <canvas ref={ref} className="block w-full h-full" />
          <LoadingOverlay visible={loading} message={loadingMessage} errored={errored} />
        </div>
      </div>
    );
  },
);
