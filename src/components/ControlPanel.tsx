// Control panel. On desktop: fixed left rail, everything visible, sections collapse
// individually. On phone: full-width bottom panel, defaults to compact (just essentials)
// with a "more" toggle that reveals font upload, slider sections, the seed input field,
// and randomize-all.

import { useEffect, useState } from "react";
import type { Params } from "../types";
import { FONTS } from "../lib/fonts";
import {
  SECTION_ORDER,
  slidersInSection,
} from "../lib/sliders";
import { Slider } from "./Slider";
import { Section } from "./Section";
import { DownloadMenu } from "./DownloadMenu";

interface Props {
  params: Params;
  onParamChange: <K extends keyof Params>(key: K, value: Params[K]) => void;
  onFontFile: (file: File) => void;
  onResetGlobalTransform: () => void;
  onResetGlyphDistortion: () => void;
  onReroll: () => void;
  onRandomizeAll: () => void;
  onFeelHeavy: () => void;
  onDownloadSVG: () => void;
  onDownloadPNG: () => void;
  status: string;
  isPhone: boolean;
}

const labelCls =
  "block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] mb-1";
const inputCls =
  "w-full py-1.5 px-2 text-[12px] border border-[var(--hairline)] bg-[var(--bg)] text-[var(--fg)]";
const btnPrimary =
  "w-full py-2 px-3 text-[10px] uppercase tracking-[0.18em] " +
  "bg-[var(--accent)] text-white hover:bg-[#c00] border border-[var(--accent)]";
const btnSecondary =
  "w-full py-2 px-3 text-[10px] uppercase tracking-[0.18em] " +
  "bg-transparent text-[var(--fg)] border border-[var(--hairline)] hover:border-[var(--accent)] hover:text-[var(--accent)]";

export function ControlPanel(props: Props) {
  const { params, onParamChange, onFontFile, status, isPhone } = props;

  // Phone defaults to compact (collapsed). Desktop always shows everything.
  const [phoneExpanded, setPhoneExpanded] = useState(false);
  useEffect(() => {
    if (!isPhone) setPhoneExpanded(false);
  }, [isPhone]);

  const showFull = !isPhone || phoneExpanded;

  const asideClass = isPhone
    ? "w-full flex-none p-4 overflow-y-auto panel-scroll bg-[var(--bg)] border-t border-[var(--hairline)] max-h-[70vh]"
    : "w-[330px] flex-none p-5 overflow-y-auto panel-scroll bg-[var(--bg)] border-r border-[var(--hairline)]";

  return (
    <aside className={asideClass}>
      <h1 className="m-0 mb-5 text-[14px] uppercase tracking-[0.3em] text-[var(--accent)]">
        NecroType
      </h1>

      <label className={labelCls}>Band name</label>
      <input
        type="text"
        value={params.text}
        onChange={(e) => onParamChange("text", e.target.value)}
        autoComplete="off"
        className={inputCls}
      />

      <label className={`${labelCls} mt-3`}>Font</label>
      <select
        value={params.fontUrl}
        onChange={(e) => onParamChange("fontUrl", e.target.value)}
        className={inputCls}
      >
        {FONTS.map((f) => (
          <option key={f.url} value={f.url}>{f.label}</option>
        ))}
      </select>

      {showFull && (
        <>
          <label className={`${labelCls} mt-2`}>Or upload .ttf / .otf</label>
          <input
            type="file"
            accept=".ttf,.otf,font/ttf,font/otf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFontFile(f);
            }}
            className="w-full"
          />

          {SECTION_ORDER.map((sec) => {
            const onReset =
              sec.id === "glyph-distortion" ? props.onResetGlyphDistortion :
              sec.id === "global-transform" ? props.onResetGlobalTransform : undefined;
            const sliders = slidersInSection(sec.id);
            return (
              <Section key={sec.id} title={sec.label} onReset={onReset}>
                {sliders.map((s) => (
                  <Slider
                    key={s.id}
                    def={s}
                    value={params[s.id] as number}
                    onChange={(v) => onParamChange(s.id, v as Params[typeof s.id])}
                  />
                ))}
              </Section>
            );
          })}
        </>
      )}

      {/* Seed: visually grouped like a section but always-open. Re-roll and Randomize-all
          both clobber the seed, so they live here too. */}
      <div className="mt-2 pt-2 border-t border-[var(--hairline)]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg)] mb-2 pl-6">
          Seed
        </div>
        <input
          type="number"
          value={params.seed}
          onChange={(e) => onParamChange("seed", parseInt(e.target.value || "0"))}
          className={inputCls}
        />
        <button
          type="button"
          onClick={props.onReroll}
          className={`${btnPrimary} mt-2`}
          title="same params, new seed"
        >
          re-roll
        </button>
        <button
          type="button"
          onClick={props.onRandomizeAll}
          className={`${btnSecondary} mt-2`}
          title="randomize every slider + font + seed"
        >
          Randomize all
        </button>
      </div>

      {/* Action block: Heavy + Download, then the dark row, then phone expand. */}
      <div className="mt-4 pt-3 border-t border-[var(--hairline)] flex flex-col gap-2">
        <button
          type="button"
          onClick={props.onFeelHeavy}
          className={btnPrimary}
          title="randomize within 'good settings' from Note.txt"
        >
          I'm feeling heavy
        </button>

        <DownloadMenu onSVG={props.onDownloadSVG} onPNG={props.onDownloadPNG} />

        {/* Whole row clicks to toggle. No visible button chrome; just label + visual switch. */}
        <button
          type="button"
          onClick={() => onParamChange("dark", !params.dark)}
          aria-pressed={params.dark}
          className="group flex items-center justify-between py-2 w-full text-left bg-transparent border-0 p-0"
          title="white-on-black vs black-on-white"
        >
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] group-hover:text-[var(--accent)]">
            Dark
          </span>
          <span
            aria-hidden="true"
            className={`switch ${params.dark ? "on" : ""} group-hover:border-[var(--accent)]`}
          />
        </button>

        {isPhone && (
          <button
            type="button"
            onClick={() => setPhoneExpanded((v) => !v)}
            className={`${btnSecondary} flex items-center justify-center gap-2`}
          >
            <span className="font-mono text-[12px]">
              {phoneExpanded ? "▴" : "▾"}
            </span>
            <span>{phoneExpanded ? "less" : "more controls"}</span>
          </button>
        )}
      </div>

      <div className="mt-4 text-[10px] text-[var(--muted)] tabular-nums min-h-[14px]">
        {status}
      </div>
    </aside>
  );
}
