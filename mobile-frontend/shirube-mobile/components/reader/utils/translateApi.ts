import { request } from '@/lib/api';

export type TranslationResult = { translatedText: string; detectedLanguage: string };

export function translateText(
  text: string,
  options: { target?: string; signal?: AbortSignal } = {},
): Promise<TranslationResult> {
  return request<TranslationResult>('/api/translate', {
    method: 'POST',
    body: JSON.stringify(options.target ? { text, target: options.target } : { text }),
    signal: options.signal,
  });
}
