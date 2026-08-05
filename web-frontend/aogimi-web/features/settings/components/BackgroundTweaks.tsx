'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   TEMPORARY — page-background auditioning tool.

   The two-layer night sky in ds-tokens.css (`--page-base`, dark theme) is being
   tuned by eye, and every round costs an edit + reload. This panel edits the
   same ten numbers live and prints the CSS to paste back.

   ── How to delete it ───────────────────────────────────────────────────────
   Delete this file and its one line in `views/SettingsView.tsx`. Nothing else
   imports it, it exports nothing, it owns no token and no shared component, and
   the styling below is inline Tailwind on purpose so there is no CSS to unpick.
   The `aogimi-bg-tweak` localStorage key is then orphaned and harmless — this is
   a dev tool, not a shipped preference, so no migration cleans it up.

   ── What it actually writes ────────────────────────────────────────────────
   Inline custom properties on `<html>`: `--sky-1/2/3` and `--page-base`. Inline
   style beats the stylesheet, so the page repaints instantly and `<html>`'s
   `background-color: var(--sky-3)` follows for overscroll.

   **The override survives client-side navigation but not a reload.** `<html>`
   is not remounted by the App Router, so tweak here → walk the dock → the whole
   app wears it, which is the point (the background is judged on the library and
   the decks stage, not on this page). A hard reload anywhere drops back to the
   stylesheet; the values are in localStorage, so re-opening /settings re-applies
   them. That re-apply is also why the values persist at all: without it, coming
   back to this page would mount the panel at its defaults and silently reset a
   background you'd already tuned.
───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { PaperCard } from '@/shared/components';

const STORAGE_KEY = 'aogimi-bg-tweak';

/** The live values in ds-tokens.css. Reset returns here. */
const DEFAULTS = {
  glowColor: '#a793f0',
  glowIntensity: 69,
  glowX: 50,
  glowY: 50,
  glowWidth: 80,
  glowHeight: 100,
  skyTop: '#16223c',
  skyMid: '#0d1526',
  skyBase: '#080514',
  midStop: 10,
};

type Tweaks = typeof DEFAULTS;

// '#a793f0' → '167, 147, 240'. The glow needs an alpha, and a hex can't carry
// one — `color-mix` could, but the CSS this panel prints is meant to be read and
// re-tuned by hand in ds-tokens.css, where plain rgba() is what's already there.
function rgbChannels(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  );
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/**
 * The `--page-base` value, formatted exactly as ds-tokens.css writes it so a
 * paste needs no reflowing. Sky stops stay `var(--sky-*)` — the trio is set
 * separately, and keeping the reference is what lets the html background-color
 * track the base.
 */
function pageBase(t: Tweaks): string {
  const rgb = rgbChannels(t.glowColor);
  return [
    `radial-gradient(${t.glowWidth}% ${t.glowHeight}% at ${t.glowX}% ${t.glowY}%,`,
    `      rgba(${rgb}, ${(t.glowIntensity / 100).toFixed(2).replace(/^0/, '')}) 0%, rgba(${rgb}, 0) 100%),`,
    `    linear-gradient(180deg,`,
    `      var(--sky-1) 0%, var(--sky-2) ${t.midStop}%, var(--sky-3) 100%)`,
  ].join('\n');
}

function snippet(t: Tweaks): string {
  return [
    `--sky-1: ${t.skyTop};`,
    `--sky-2: ${t.skyMid};`,
    `--sky-3: ${t.skyBase};`,
    ``,
    `--page-base:`,
    `    ${pageBase(t)};`,
  ].join('\n');
}

function apply(t: Tweaks) {
  const s = document.documentElement.style;
  s.setProperty('--sky-1', t.skyTop);
  s.setProperty('--sky-2', t.skyMid);
  s.setProperty('--sky-3', t.skyBase);
  s.setProperty('--page-base', pageBase(t));
}

function clear() {
  const s = document.documentElement.style;
  for (const p of ['--sky-1', '--sky-2', '--sky-3', '--page-base']) s.removeProperty(p);
}

export function BackgroundTweaks() {
  const [t, setT] = useState<Tweaks>(DEFAULTS);
  const [copied, setCopied] = useState(false);

  // Restore, once. Reading localStorage in a lazy initialiser instead would
  // desync SSR's markup from the client's first render.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted state on mount, not a render-loop
      setT({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Paint + persist together: every edit is meant to be seen and to survive the
  // walk to another route.
  useEffect(() => {
    apply(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  }, [t]);

  const set = <K extends keyof Tweaks>(k: K, v: Tweaks[K]) => setT((p) => ({ ...p, [k]: v }));

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    clear();
    setT(DEFAULTS);
  };

  const copy = () => {
    void navigator.clipboard.writeText(snippet(t)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <PaperCard className="p-5">
      <p className="mb-4 text-[12px] leading-[1.5] text-(--muted)">
        Temporary. Edits <code>--page-base</code> on <code>&lt;html&gt;</code> live — navigate away and the app keeps
        it, reload and it&apos;s back to the stylesheet. Copy pastes into <code>styles/ds-tokens.css</code>.
      </p>

      <Group label="Glow">
        <Color label="Colour" value={t.glowColor} onChange={(v) => set('glowColor', v)} />
        <Num label="Intensity" value={t.glowIntensity} max={100} onChange={(v) => set('glowIntensity', v)} />
        <Num label="X" value={t.glowX} max={100} onChange={(v) => set('glowX', v)} />
        <Num label="Y" value={t.glowY} max={100} onChange={(v) => set('glowY', v)} />
        <Num label="Width" value={t.glowWidth} max={200} onChange={(v) => set('glowWidth', v)} />
        <Num label="Height" value={t.glowHeight} max={200} onChange={(v) => set('glowHeight', v)} />
      </Group>

      <Group label="Sky">
        <Color label="Top" value={t.skyTop} onChange={(v) => set('skyTop', v)} />
        <Color label="Mid" value={t.skyMid} onChange={(v) => set('skyMid', v)} />
        <Color label="Base" value={t.skyBase} onChange={(v) => set('skyBase', v)} />
        <Num label="Mid stop" value={t.midStop} max={100} onChange={(v) => set('midStop', v)} />
      </Group>

      <pre className="mt-4 overflow-x-auto rounded-(--radius-button) bg-(--paper-tile) p-3 text-[11px] leading-[1.45] text-(--soft)">
        {snippet(t)}
      </pre>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="rounded-(--radius-button) border border-(--paper-bd) px-3 py-2 text-[12px] font-bold text-(--soft) hover:border-(--btn) hover:text-(--btn)"
        >
          {copied ? 'Copied' : 'Copy CSS'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-(--radius-button) border border-(--paper-bd) px-3 py-2 text-[12px] font-bold text-(--soft) hover:border-(--btn) hover:text-(--btn)"
        >
          Reset
        </button>
      </div>
    </PaperCard>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────
// Deliberately dumb and local: no shared primitive earns a new file for a panel
// that is going to be deleted.

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-(--faint) uppercase">{label}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3 text-[12.5px] text-(--soft)">
      <span className="w-[72px] shrink-0">{label}</span>
      {children}
    </label>
  );
}

function Num({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <Row label={label}>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-(--btn)"
      />
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-[58px] shrink-0 rounded-(--radius-button) border border-(--paper-bd) bg-transparent px-2 py-1 text-right font-[family-name:var(--face-mono)] text-[12px] text-(--ink)"
      />
    </Row>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row label={label}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-10 shrink-0 cursor-pointer rounded border border-(--paper-bd) bg-transparent"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-[88px] shrink-0 rounded-(--radius-button) border border-(--paper-bd) bg-transparent px-2 py-1 font-[family-name:var(--face-mono)] text-[12px] text-(--ink)"
      />
    </Row>
  );
}
