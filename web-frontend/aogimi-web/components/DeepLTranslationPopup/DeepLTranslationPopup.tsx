'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { translateText } from '@/lib/translateApi';

type Position = { x: number; y: number };

type TranslationState =
  | { status: 'loading' }
  | { status: 'success'; translatedText: string; detectedLanguage: string }
  | { status: 'error'; message: string };

type Props = {
  originalText: string;
  position: Position;
  onClose: () => void;
};

export function DeepLTranslationPopup({ originalText, position, onClose }: Props) {
  const [state, setState] = useState<TranslationState>({ status: 'loading' });
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<Position>(position);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    translateText(originalText)
      .then(({ translatedText, detectedLanguage }) => {
        if (!cancelled) setState({ status: 'success', translatedText, detectedLanguage });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Translation failed.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [originalText]);

  useEffect(() => {
    if (!popupRef.current) return;
    const { offsetWidth, offsetHeight } = popupRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setAdjustedPos({
      x: Math.min(Math.max(8, position.x), vw - offsetWidth - 8),
      y: Math.min(Math.max(8, position.y), vh - offsetHeight - 8),
    });
  }, [position, state]);

  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleOutsideClick]);

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 10000,
      }}
      className="lgc-card w-72"
    >
      <div className="flex items-center justify-between border-b border-lgc-border px-3 py-2">
        <span className="text-xs font-medium text-lgc-fg-muted">DeepL Translation</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close translation"
          className="leading-none text-sm text-lgc-fg-muted hover:text-lgc-fg"
        >
          ✕
        </button>
      </div>

      <div className="px-3 pt-2 pb-1">
        <p className="mb-1 text-xs font-medium text-lgc-fg-muted">Original</p>
        <p className="rounded bg-lgc-bg-sunken px-2 py-1.5 text-sm text-lgc-fg wrap-break-word">{originalText}</p>
      </div>

      <div className="px-3 pb-3 pt-1">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-lgc-fg-muted">
          Translation
          {state.status === 'success' && (
            <span
              className="rounded px-1 py-0.5 text-[10px] font-normal text-lgc-accent"
              style={{ background: 'var(--lgc-accent-soft)' }}
            >
              {state.detectedLanguage} → EN
            </span>
          )}
        </p>
        {state.status === 'loading' && <p className="text-sm italic text-lgc-fg-muted">Translating…</p>}
        {state.status === 'error' && <p className="text-sm text-red-500">{state.message}</p>}
        {state.status === 'success' && <p className="text-sm text-lgc-fg wrap-break-word">{state.translatedText}</p>}
      </div>
    </div>
  );
}
