// Calls the local Next.js route at /api/translate (which proxies DeepL with the
// server-side API key). No API_URL prefix — this is a same-origin route.

import type { TranslationResult } from '@/lib/types';

export async function translateText(text: string): Promise<TranslationResult> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    translatedText?: string;
    detectedLanguage?: string;
    error?: string;
  };
  if (!res.ok || !data.translatedText) {
    throw new Error(data.error ?? 'Translation failed.');
  }
  return {
    translatedText: data.translatedText,
    detectedLanguage: data.detectedLanguage ?? '',
  };
}
