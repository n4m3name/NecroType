// White overlay with pulsing "loading" text. Shown only during async font load /
// upload — slider drags don't show it because the fast preview matches the final closely.

interface Props {
  visible: boolean;
  message: string;
  errored?: boolean;
}

export function LoadingOverlay({ visible, message, errored }: Props) {
  if (!visible) return null;
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ background: "rgba(255, 255, 255, 0.88)" }}
    >
      <span
        className={
          "text-[12px] tracking-[0.25em] uppercase " +
          (errored ? "text-[var(--accent)]" : "text-[#666] loading-pulse")
        }
      >
        {message}
      </span>
    </div>
  );
}
