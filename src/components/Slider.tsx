// Single labeled slider. Layout: label (left) + editable value readout (right) on top,
// slider track full-width below. Row gets a left-border accent on focus-within.
//
// The value readout is a real <input type="number"> styled to look identical to plain text
// until clicked — black-on-black, no border, right-aligned. Click it to drag the slider OR
// type a value directly. Typing keeps a local string until blur / Enter; only then is the
// value parsed, clamped to range, snapped to step, and committed. Escape reverts.

import { useEffect, useState } from "react";
import type { SliderDef } from "../lib/sliders";
import { snapToStep } from "../lib/sliders";

interface Props {
  def: SliderDef;
  value: number;
  onChange: (v: number) => void;
}

export function Slider({ def, value, onChange }: Props) {
  const [text, setText] = useState(String(value));

  // Resync the input string whenever the underlying value changes externally (slider drag,
  // randomize, reroll, reset). User mid-type is fine: typing only mutates the local string,
  // so `value` doesn't change and this effect doesn't fire until they commit.
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const v = parseFloat(text);
    if (isNaN(v)) {
      setText(String(value));
      return;
    }
    const snapped = snapToStep(def, v);
    if (snapped !== value) onChange(snapped);
    setText(String(snapped));
  };

  return (
    <div className="slider-row">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
          {def.label}
        </label>
        <input
          type="number"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setText(String(value));
              e.currentTarget.blur();
            }
          }}
          step={def.step}
          min={def.min}
          max={def.max}
          // Black-on-black; identical to plain text until focused. No border, no spinners.
          className="
            slider-value w-16 text-right text-[12px] tabular-nums
            bg-transparent text-[var(--fg)] border-none outline-none p-0 m-0
            no-spin
          "
        />
      </div>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        // Snap on every change so values stay clean (HTML range inputs leak float noise like
        // `1e-17` near step boundaries; without snapping you can drag past zero but never
        // land exactly on it).
        onChange={(e) => onChange(snapToStep(def, parseFloat(e.target.value)))}
      />
    </div>
  );
}
