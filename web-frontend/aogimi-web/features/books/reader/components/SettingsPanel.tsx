'use client';

// The Display popover. Every group is optional, so each reader gets exactly the
// controls its engine can honour: the text reader gets all of them, the manga
// reader gets page layout only (typeface and page colour mean nothing over
// fixed-layout images), and the PDF reader doesn't open this panel at all.
//
// Font size is a percentage, not the handoff's 16–40px. Foliate scales the
// book's own type by a percentage, so a px readout would be a number we made up.

import type { ReaderPrefs } from '../hooks/useReaderPrefs';
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LINE_SPACING_STOPS,
} from '../hooks/useReaderPrefs';
import { THEMES } from '../lib/readerConstants';
import { GLASS_PRESS, HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { ReaderPanel } from './ReaderShell';

const GROUP_LABEL =
  'mb-[9px] font-[family-name:var(--face-mono)] text-[10px] tracking-[0.16em] uppercase text-(--muted)';

// ── Segmented control ───────────────────────────────────────────────────────

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; style?: React.CSSProperties }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-[7px]" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.key)}
            style={o.style}
            className={cn(
              GLASS_PRESS,
              'cursor-pointer rounded-[9px] py-2.5 text-center text-[15px]',
              'transition-[color,background-color,border-color,transform] duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
              on
                ? 'border border-transparent bg-(--active) text-(--active-ink)'
                : cn('border bg-transparent text-(--soft) hover:text-(--ink)', HAIRLINE),
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Slider ──────────────────────────────────────────────────────────────────

// Track, fill and thumb are drawn as divs with a transparent native range on
// top: full control of the look, and keyboard support and screen-reader
// semantics come free from the real input.
function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  /** Rendered under the track ends — `16` / `40`, or the spacing dots. */
  ends,
  dots,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  label: string;
  ends?: [string, string];
  dots?: number;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className="relative h-[18px]">
      <div className="absolute inset-x-0 top-[7px] h-1 rounded-[3px] bg-(--track)" />
      {dots ? (
        <div className="absolute inset-x-0 top-1 flex justify-between">
          {Array.from({ length: dots }, (_, i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-(--track)" />
          ))}
        </div>
      ) : (
        <div
          className="absolute top-[7px] left-0 h-1 rounded-[3px] bg-(--ink)"
          style={{ width: `${pct}%` }}
        />
      )}
      <div
        aria-hidden
        className="absolute top-0 h-[18px] w-[18px] rounded-full border-2 border-(--ink) bg-(--bg) shadow-(--card-shadow)"
        style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
      />
      {ends && (
        <>
          <span className="absolute -top-4 left-0 font-[family-name:var(--face-mono)] text-[9px] text-(--faint)">
            {ends[0]}
          </span>
          <span className="absolute -top-4 right-0 font-[family-name:var(--face-mono)] text-[9px] text-(--faint)">
            {ends[1]}
          </span>
        </>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

// ── Panel ───────────────────────────────────────────────────────────────────

export type ViewModeOption = { key: string; label: string; title: string };

export function SettingsPanel({
  onClose,
  prefs,
  onChange,
  viewModes,
  viewMode,
  onViewModeChange,
}: {
  onClose: () => void;
  /** Text-reader typography + layout. Omit for a reader that has none. */
  prefs?: ReaderPrefs;
  onChange?: (next: Partial<ReaderPrefs>) => void;
  /** Fixed-layout page arrangement — manga's single / double / scroll. */
  viewModes?: ViewModeOption[];
  viewMode?: string;
  onViewModeChange?: (key: string) => void;
}) {
  const spacingIndex = prefs
    ? Math.max(
        0,
        LINE_SPACING_STOPS.findIndex((s) => s === prefs.lineSpacing),
      )
    : 0;

  return (
    <ReaderPanel title="Display" subtitle="表示" onClose={onClose}>
      {prefs && onChange && (
        <>
          <div className="mb-[22px]">
            <div className={GROUP_LABEL}>Typeface</div>
            <Segmented
              value={prefs.fontFamily}
              onChange={(fontFamily) => onChange({ fontFamily })}
              options={[
                { key: 'serif-jp', label: '明朝', style: { fontFamily: 'serif' } },
                { key: 'sans-jp', label: 'ゴシック', style: { fontFamily: 'sans-serif' } },
                { key: 'system', label: 'System', style: { fontFamily: 'system-ui' } },
              ]}
            />
          </div>

          <div className="mb-[22px]">
            <div className="mb-[11px] flex items-baseline justify-between">
              <span className="font-[family-name:var(--face-mono)] text-[10px] tracking-[0.16em] uppercase text-(--muted)">
                Font size
              </span>
              <span className="font-[family-name:var(--face-mono)] text-xs font-bold text-(--ink)">
                {prefs.fontSize} %
              </span>
            </div>
            <Slider
              label="Font size"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              step={10}
              value={prefs.fontSize}
              onChange={(fontSize) => onChange({ fontSize })}
              ends={[String(FONT_SIZE_MIN), String(FONT_SIZE_MAX)]}
            />
          </div>

          <div className="mb-[22px]">
            <div className={GROUP_LABEL}>Line spacing</div>
            <Slider
              label="Line spacing"
              min={0}
              max={LINE_SPACING_STOPS.length - 1}
              value={spacingIndex}
              dots={LINE_SPACING_STOPS.length}
              onChange={(i) => onChange({ lineSpacing: LINE_SPACING_STOPS[i] })}
            />
          </div>

          <div className="mb-[22px]">
            <div className={GROUP_LABEL}>Writing mode</div>
            <Segmented
              value={prefs.writingMode}
              onChange={(writingMode) => onChange({ writingMode })}
              options={[
                { key: 'horizontal', label: '横書き' },
                { key: 'vertical', label: '縦書き' },
              ]}
            />
          </div>

          <div className="mb-[22px]">
            <div className={GROUP_LABEL}>Page flow</div>
            <Segmented
              value={prefs.flowMode}
              onChange={(flowMode) => onChange({ flowMode })}
              options={[
                { key: 'paginated', label: 'Paged' },
                { key: 'scrolled', label: 'Scroll' },
              ]}
            />
          </div>

          <div>
            <div className={GROUP_LABEL}>Page colour</div>
            <div className="grid grid-cols-3 gap-[7px]">
              {(['light', 'dark', 'sepia'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={prefs.theme === t}
                  onClick={() => onChange({ theme: t })}
                  style={{ background: THEMES[t].bg, color: THEMES[t].fg }}
                  className={cn(
                    GLASS_PRESS,
                    'cursor-pointer rounded-[9px] border px-2 py-2.5 text-[11px] font-medium transition-all duration-150',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                    // A ring, not a fill: these swatches ARE their page colour,
                    // so selection has to sit outside them. --active either way.
                    prefs.theme === t
                      ? 'border-transparent ring-2 ring-(--active) ring-offset-1'
                      : cn('hover:opacity-80', HAIRLINE),
                  )}
                >
                  {t === 'light' ? 'Light' : t === 'dark' ? 'Dark' : 'Sepia'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {viewModes && viewMode && onViewModeChange && (
        <div>
          <div className={GROUP_LABEL}>Page layout</div>
          <Segmented
            value={viewMode}
            onChange={onViewModeChange}
            options={viewModes.map((m) => ({ key: m.key, label: m.label }))}
          />
        </div>
      )}
    </ReaderPanel>
  );
}
