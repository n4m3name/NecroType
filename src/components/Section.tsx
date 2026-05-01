// Collapsible section header. Brutalist: top hairline, +/- toggle marker, optional reset
// button on the right. No tree characters, no animation.

import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  onReset?: () => void;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Section({ title, onReset, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-2 pt-2 border-t border-[var(--hairline)]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="
            flex items-center gap-3 flex-1 text-left
            text-[10px] uppercase tracking-[0.18em]
            hover:text-[var(--accent)]
          "
          aria-expanded={open}
        >
          <span className="font-mono w-3 text-center text-white/40">
            {open ? "−" : "+"}
          </span>
          <span className={open ? "text-[var(--accent)]" : "text-[var(--fg)]"}>
            {title}
          </span>
        </button>
        {onReset && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="
              text-[9px] uppercase tracking-[0.18em]
              text-white/40 hover:text-[var(--accent)]
              border border-[var(--hairline)] px-2 py-[2px]
              hover:border-[var(--accent)]
            "
            title={`reset ${title.toLowerCase()}`}
          >
            reset
          </button>
        )}
      </div>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
