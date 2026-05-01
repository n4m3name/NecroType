// "Download" button + center-screen modal overlay. Click button → fullscreen backdrop +
// centered modal with format options. Click backdrop, click cancel, or press Escape to close.

import { useEffect, useRef, useState } from "react";

interface Props {
  onSVG: () => void;
  onPNG: () => void;
}

export function DownloadMenu({ onSVG, onPNG }: Props) {
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    // Focus the modal so keyboard focus is contained
    modalRef.current?.focus();
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  const optionBtn =
    "block w-full text-left px-4 py-3 text-[11px] uppercase tracking-[0.18em] " +
    "bg-[var(--bg)] text-[var(--fg)] border border-[var(--hairline)] " +
    "hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          w-full py-2 px-3 text-[10px] uppercase tracking-[0.18em]
          bg-[var(--accent)] text-white hover:bg-[#c00] border border-[var(--accent)]
        "
      >
        Download
      </button>

      {open && (
        <>
          {/* Backdrop. Click anywhere outside the modal to dismiss. */}
          <div
            className="fixed inset-0 z-40 bg-black/75"
            onClick={() => setOpen(false)}
          />
          {/* Modal. position:fixed so it ignores the panel's stacking context. */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              ref={modalRef}
              tabIndex={-1}
              className="
                pointer-events-auto outline-none
                bg-[var(--bg)] border border-[var(--hairline)]
                w-[min(420px,100%)] p-6
              "
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted)] mb-4">
                Download as
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => { onSVG(); setOpen(false); }}
                  className={optionBtn}
                  title="single-path SVG, ready for vector editing"
                >
                  SVG <span className="text-[var(--muted)] normal-case tracking-normal text-[10px]">— vector, single path</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onPNG(); setOpen(false); }}
                  className={optionBtn}
                  title="3000px transparent PNG"
                >
                  PNG <span className="text-[var(--muted)] normal-case tracking-normal text-[10px]">— 3000px, transparent</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="
                  mt-4 w-full py-2 px-3 text-[10px] uppercase tracking-[0.18em]
                  bg-transparent text-[var(--muted)] hover:text-[var(--fg)]
                "
              >
                cancel  (esc)
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
