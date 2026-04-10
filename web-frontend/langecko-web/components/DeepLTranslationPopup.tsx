'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

async function callTranslateApi(
  text: string,
): Promise<{ translatedText: string; detectedLanguage: string }> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await res.json() as {
    translatedText?: string;
    detectedLanguage?: string;
    error?: string;
  };
  if (!res.ok || !data.translatedText) {
    throw new Error(data.error ?? 'Translation failed.');
  }
  return { translatedText: data.translatedText, detectedLanguage: data.detectedLanguage ?? '' };
}

export function DeepLTranslationPopup({ originalText, position, onClose }: Props) {
  const [state, setState] = useState<TranslationState>({ status: 'loading' });
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<Position>(position);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    callTranslateApi(originalText)
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
    return () => { cancelled = true; };
  }, [originalText]);

  // Clamp popup within viewport after mount / state change
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
      style={{ position: 'fixed', left: adjustedPos.x, top: adjustedPos.y, zIndex: 10000 }}
      className="w-72 rounded-lg border border-lumina-border-divider bg-white shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-lumina-border-divider px-3 py-2">
        <span className="text-xs font-medium text-lumina-secondary-text">DeepL Translation</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close translation"
          className="leading-none text-sm text-lumina-secondary-text hover:text-lumina-primary-text"
        >
          ✕
        </button>
      </div>

      {/* Original text */}
      <div className="px-3 pt-2 pb-1">
        <p className="mb-1 text-xs font-medium text-lumina-secondary-text">Original</p>
        <p className="rounded bg-lumina-app-background px-2 py-1.5 text-sm text-lumina-primary-text break-words">
          {originalText}
        </p>
      </div>

      {/* Translation */}
      <div className="px-3 pb-3 pt-1">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-lumina-secondary-text">
          Translation
          {state.status === 'success' && (
            <span className="rounded bg-[#12b5b0]/10 px-1 py-0.5 text-[10px] font-normal text-[#12b5b0]">
              {state.detectedLanguage} → EN
            </span>
          )}
        </p>
        {state.status === 'loading' && (
          <p className="text-sm italic text-lumina-secondary-text">Translating…</p>
        )}
        {state.status === 'error' && (
          <p className="text-sm text-red-500">{state.message}</p>
        )}
        {state.status === 'success' && (
          <p className="text-sm text-lumina-primary-text break-words">{state.translatedText}</p>
        )}
      </div>
    </div>
  );
}
