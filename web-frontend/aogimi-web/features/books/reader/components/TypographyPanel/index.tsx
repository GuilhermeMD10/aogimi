'use client';

import { Minus, Plus, X } from 'lucide-react';
import type { ReaderPrefs } from '@/features/books/reader/hooks/useReaderPrefs';
import { THEMES, ICON_BTN } from '@/features/books/reader/lib/readerConstants';

const TYPO_LABEL = 'mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-lgc-fg-muted';
const TYPO_BTN = 'rounded-md px-2.5 py-1.5 text-[11px] transition-colors';
const TYPO_BTN_ON = 'bg-lgc-accent text-lgc-accent-fg';
const TYPO_BTN_OFF = 'bg-lgc-bg-sunken text-lgc-fg-muted hover:text-lgc-fg';

export type TypographyPanelProps = {
  prefs: ReaderPrefs;
  onSavePrefs: (p: Partial<ReaderPrefs>) => void;
  onClose: () => void;
};

export function TypographyPanel({ prefs, onSavePrefs, onClose }: TypographyPanelProps) {
  return (
    <div className="w-80 rounded-xl border border-lgc-border-strong bg-lgc-bg-elev p-4 shadow-xl">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-lgc-fg">Typography & Layout</span>
        <button type="button" onClick={onClose} className={ICON_BTN} style={{ width: 24, height: 24 }}>
          <X size={13} />
        </button>
      </div>

      <div className="mb-3.5">
        <div className={TYPO_LABEL}>Font</div>
        <div className="grid grid-cols-3 gap-1">
          {(['serif-jp', 'sans-jp', 'system'] as const).map((f) => (
            <button
              key={f} type="button"
              onClick={() => onSavePrefs({ fontFamily: f })}
              className={`${TYPO_BTN} ${prefs.fontFamily === f ? TYPO_BTN_ON : TYPO_BTN_OFF}`}
              style={{ fontFamily: f === 'serif-jp' ? 'serif' : f === 'sans-jp' ? 'sans-serif' : 'system-ui' }}
            >
              {f === 'serif-jp' ? '明朝' : f === 'sans-jp' ? 'ゴシック' : 'System'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3.5">
        <div className={TYPO_LABEL}>Size</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onSavePrefs({ fontSize: Math.max(70, prefs.fontSize - 10) })} className={ICON_BTN} style={{ width: 28, height: 28 }}><Minus size={12} /></button>
          <div className="flex-1 text-center text-xs font-medium text-lgc-fg font-mono">{prefs.fontSize}%</div>
          <button type="button" onClick={() => onSavePrefs({ fontSize: Math.min(200, prefs.fontSize + 10) })} className={ICON_BTN} style={{ width: 28, height: 28 }}><Plus size={12} /></button>
        </div>
      </div>

      <div className="mb-3.5">
        <div className={TYPO_LABEL}>Line height</div>
        <div className="flex gap-1">
          {[1.2, 1.4, 1.6, 1.8, 2.0].map((lh) => (
            <button key={lh} type="button" onClick={() => onSavePrefs({ lineSpacing: lh })} className={`${TYPO_BTN} flex-1 ${prefs.lineSpacing === lh ? TYPO_BTN_ON : TYPO_BTN_OFF}`}>{lh}</button>
          ))}
        </div>
      </div>

      <div>
        <div className={TYPO_LABEL}>Theme</div>
        <div className="grid grid-cols-3 gap-1">
          {(['light', 'dark', 'sepia'] as const).map((t) => (
            <button
              key={t} type="button"
              onClick={() => onSavePrefs({ theme: t })}
              className={`flex items-center justify-center rounded-md px-2 py-2.5 text-[11px] font-medium transition-all ${prefs.theme === t ? 'ring-2 ring-lgc-accent ring-offset-1' : 'hover:opacity-80'}`}
              style={{ background: THEMES[t].bg, color: THEMES[t].fg, border: '1px solid var(--lgc-border)' }}
            >
              {t === 'light' ? 'Light' : t === 'dark' ? 'Dark' : 'Sepia'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
