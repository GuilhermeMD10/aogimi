import Constants from 'expo-constants';
import type { SearchResponse, WordDetails } from './types';

/**
 * Resolves the backend base URL.
 *
 * On a real device the backend is not reachable via `localhost` — the device
 * needs the host machine's LAN IP. Override via `EXPO_PUBLIC_API_URL` at dev
 * time, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.42:3000 npx expo start`.
 */
function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return fromConfig ?? 'http://localhost:3000';
}

export const API_BASE = resolveApiBase();

export async function queryDictionary(
  q: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Search failed');
  }
  return (await res.json()) as SearchResponse;
}

export async function fetchWordDetails(
  id: string | number,
  signal?: AbortSignal,
): Promise<WordDetails> {
  const res = await fetch(`${API_BASE}/api/words/${encodeURIComponent(String(id))}/details`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Failed to load word');
  }
  return (await res.json()) as WordDetails;
}

export interface TranslationResult {
  translatedText: string;
  /** DeepL-detected source language code, e.g. "JA". May be empty. */
  detectedLanguage: string;
}

/**
 * Proxy-translate a selection via the backend's DeepL endpoint. Default target
 * is English; pass a DeepL code (e.g. "PT-BR") to override. The upstream key
 * lives on the server — nothing about the key is exposed to the client.
 */
export async function translateText(
  text: string,
  options: { target?: string; signal?: AbortSignal } = {},
): Promise<TranslationResult> {
  const { target, signal } = options;
  const res = await fetch(`${API_BASE}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(target ? { text, target } : { text }),
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Translation failed');
  }
  return (await res.json()) as TranslationResult;
}
