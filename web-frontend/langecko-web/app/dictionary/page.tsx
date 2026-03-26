'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type KanjiResult = {
  kanji: string;
  grade: number | null;
  stroke_count: number;
  meanings: string[];
  kun_readings: string[];
  on_readings: string[];
  name_readings: string[];
  jlpt: number | null;
  unicode: string;
};

type WordVariant = {
  written: string;
  pronounced: string;
  priorities: string[];
};

type WordMeaning = {
  glosses: string[];
};

type WordEntry = {
  variants: WordVariant[];
  meanings: WordMeaning[];
};

type ReadingResult = {
  reading: string;
  main_kanji: string[];
  name_kanji: string[];
};

type EndpointKind = 'kanji' | 'reading';

type RunSearchOptions = {
  preferredReadingSlug?: string;
};

const READING_QUERY_PARAM = 'reading';
const CONSONANT_REGEX = /[bcdfghjklmnpqrstvwxyz]/;

const ROMAJI_MAP_THREE: Record<string, string> = {
  kya: 'きゃ',
  kyu: 'きゅ',
  kyo: 'きょ',
  gya: 'ぎゃ',
  gyu: 'ぎゅ',
  gyo: 'ぎょ',
  sha: 'しゃ',
  shu: 'しゅ',
  sho: 'しょ',
  sya: 'しゃ',
  syu: 'しゅ',
  syo: 'しょ',
  jya: 'じゃ',
  jyu: 'じゅ',
  jyo: 'じょ',
  cha: 'ちゃ',
  chu: 'ちゅ',
  cho: 'ちょ',
  tya: 'ちゃ',
  tyu: 'ちゅ',
  tyo: 'ちょ',
  nya: 'にゃ',
  nyu: 'にゅ',
  nyo: 'にょ',
  hya: 'ひゃ',
  hyu: 'ひゅ',
  hyo: 'ひょ',
  mya: 'みゃ',
  myu: 'みゅ',
  myo: 'みょ',
  rya: 'りゃ',
  ryu: 'りゅ',
  ryo: 'りょ',
  bya: 'びゃ',
  byu: 'びゅ',
  byo: 'びょ',
  pya: 'ぴゃ',
  pyu: 'ぴゅ',
  pyo: 'ぴょ',
  shi: 'し',
  chi: 'ち',
  tsu: 'つ',
};

const ROMAJI_MAP_TWO: Record<string, string> = {
  ka: 'か',
  ki: 'き',
  ku: 'く',
  ke: 'け',
  ko: 'こ',
  sa: 'さ',
  su: 'す',
  se: 'せ',
  so: 'そ',
  ta: 'た',
  te: 'て',
  to: 'と',
  na: 'な',
  ni: 'に',
  nu: 'ぬ',
  ne: 'ね',
  no: 'の',
  ha: 'は',
  hi: 'ひ',
  fu: 'ふ',
  he: 'へ',
  ho: 'ほ',
  ma: 'ま',
  mi: 'み',
  mu: 'む',
  me: 'め',
  mo: 'も',
  ya: 'や',
  yu: 'ゆ',
  yo: 'よ',
  ra: 'ら',
  ri: 'り',
  ru: 'る',
  re: 'れ',
  ro: 'ろ',
  wa: 'わ',
  wo: 'を',
  ga: 'が',
  gi: 'ぎ',
  gu: 'ぐ',
  ge: 'げ',
  go: 'ご',
  za: 'ざ',
  ja: 'じゃ',
  ju: 'じゅ',
  jo: 'じょ',
  ji: 'じ',
  zu: 'ず',
  ze: 'ぜ',
  zo: 'ぞ',
  da: 'だ',
  de: 'で',
  do: 'ど',
  ba: 'ば',
  bi: 'び',
  bu: 'ぶ',
  be: 'べ',
  bo: 'ぼ',
  pa: 'ぱ',
  pi: 'ぴ',
  pu: 'ぷ',
  pe: 'ぺ',
  po: 'ぽ',
  fa: 'ふぁ',
  fi: 'ふぃ',
  fe: 'ふぇ',
  fo: 'ふぉ',
  va: 'ゔぁ',
  vi: 'ゔぃ',
  vu: 'ゔ',
  ve: 'ゔぇ',
  vo: 'ゔぉ',
};

const ROMAJI_MAP_ONE: Record<string, string> = {
  a: 'あ',
  i: 'い',
  u: 'う',
  e: 'え',
  o: 'お',
};

const HIRAGANA_TO_ROMAJI: Record<string, string> = {
  ...Object.fromEntries(Object.entries(ROMAJI_MAP_THREE).map(([romaji, kana]) => [kana, romaji])),
  ...Object.fromEntries(Object.entries(ROMAJI_MAP_TWO).map(([romaji, kana]) => [kana, romaji])),
  ...Object.fromEntries(Object.entries(ROMAJI_MAP_ONE).map(([romaji, kana]) => [kana, romaji])),
  ん: 'n',
};

const isKanjiCharacter = (value: string): boolean => /\p{Script=Han}/u.test(value);
const isKanaReading = (value: string): boolean => /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(value);
const isRomajiReading = (value: string): boolean => /^[a-zA-Z]+$/.test(value);
const hasHiragana = (value: string): boolean => /[\u3041-\u3096]/u.test(value);
const hasKatakana = (value: string): boolean => /[\u30A1-\u30FA]/u.test(value);

const normalizeReadingSlug = (value: string): string => value.toLowerCase().replace(/[^a-z]/g, '');

const toKatakana = (value: string): string =>
  value.replace(/[\u3041-\u3096]/g, (character) => String.fromCharCode(character.charCodeAt(0) + 0x60));

const toHiragana = (value: string): string =>
  value.replace(/[\u30A1-\u30FA]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60));

function romajiToHiragana(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  if (!normalized || !isRomajiReading(normalized)) {
    return null;
  }

  let result = '';
  let index = 0;

  while (index < normalized.length) {
    const current = normalized[index];
    const next = normalized[index + 1];

    if (next && current === next && current !== 'n' && CONSONANT_REGEX.test(current)) {
      result += 'っ';
      index += 1;
      continue;
    }

    if (current === 'n') {
      if (!next) {
        result += 'ん';
        index += 1;
        continue;
      }

      if (next === 'n') {
        result += 'ん';
        index += 1;
        continue;
      }

      if (!/[aiueoy]/.test(next)) {
        result += 'ん';
        index += 1;
        continue;
      }
    }

    const three = normalized.slice(index, index + 3);
    if (three in ROMAJI_MAP_THREE) {
      result += ROMAJI_MAP_THREE[three];
      index += 3;
      continue;
    }

    const two = normalized.slice(index, index + 2);
    if (two in ROMAJI_MAP_TWO) {
      result += ROMAJI_MAP_TWO[two];
      index += 2;
      continue;
    }

    const one = normalized[index];
    if (one in ROMAJI_MAP_ONE) {
      result += ROMAJI_MAP_ONE[one];
      index += 1;
      continue;
    }

    return null;
  }

  return result;
}

function kanaToRomaji(input: string): string {
  const normalized = toHiragana(input).replace(/[^\p{Script=Hiragana}ー]/gu, '');

  let result = '';
  let index = 0;
  let hasGeminate = false;

  while (index < normalized.length) {
    const current = normalized[index];

    if (current === 'っ') {
      hasGeminate = true;
      index += 1;
      continue;
    }

    if (current === 'ー') {
      const lastVowel = result.match(/[aeiou](?=[^aeiou]*$)/)?.[0];
      if (lastVowel) {
        result += lastVowel;
      }
      index += 1;
      continue;
    }

    const twoKana = normalized.slice(index, index + 2);
    const oneKana = normalized[index];
    let romaji = HIRAGANA_TO_ROMAJI[twoKana];

    if (romaji) {
      index += 2;
    } else {
      romaji = HIRAGANA_TO_ROMAJI[oneKana];
      index += 1;
    }

    if (!romaji) {
      hasGeminate = false;
      continue;
    }

    if (hasGeminate && CONSONANT_REGEX.test(romaji[0])) {
      result += romaji[0];
    }

    result += romaji;
    hasGeminate = false;
  }

  return normalizeReadingSlug(result);
}

function toReadingSlugFromInput(input: string): string {
  const trimmed = input.trim();

  if (isRomajiReading(trimmed)) {
    return normalizeReadingSlug(trimmed);
  }

  if (isKanaReading(trimmed)) {
    return kanaToRomaji(trimmed);
  }

  return '';
}

function toReadingSlugFromKanjiResult(result: KanjiResult): string {
  const readingCandidates = [...result.kun_readings, ...result.on_readings, ...result.name_readings]
    .map((value) => value.replace(/[\.\-]/g, ''))
    .map((value) => value.replace(/[^\p{Script=Hiragana}\p{Script=Katakana}ー]/gu, ''))
    .filter(Boolean);

  for (const readingValue of readingCandidates) {
    const romaji = kanaToRomaji(readingValue);
    if (romaji) {
      return romaji;
    }
  }

  return '';
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function findFirstKanji(input: string): string | null {
  return Array.from(input).find((character) => isKanjiCharacter(character)) ?? null;
}

function buildReadingCandidates(input: string): string[] {
  if (isKanaReading(input)) {
    if (hasHiragana(input)) {
      return uniqueValues([input, toKatakana(input)]);
    }
    if (hasKatakana(input)) {
      return uniqueValues([input, toHiragana(input)]);
    }
    return [input];
  }

  if (isRomajiReading(input)) {
    const hiragana = romajiToHiragana(input);
    if (!hiragana) {
      return [];
    }
    return uniqueValues([hiragana, toKatakana(hiragana)]);
  }

  return [];
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    if (payload.error) {
      return payload.error;
    }
    if (payload.message) {
      return payload.message;
    }
  } catch {
    return response.statusText || 'Request failed';
  }

  return response.statusText || 'Request failed';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as T;
}

async function fetchReadingWithFallback(readingCandidates: string[]): Promise<{
  reading: ReadingResult;
  resolvedReading: string;
}> {
  let fallbackError: Error | null = null;

  for (const readingCandidate of readingCandidates) {
    try {
      const reading = await fetchJson<ReadingResult>(
        `https://kanjiapi.dev/v1/reading/${encodeURIComponent(readingCandidate)}`,
      );
      return { reading, resolvedReading: readingCandidate };
    } catch (error) {
      if (error instanceof Error && error.message.includes('No such endpoint')) {
        fallbackError = error;
        continue;
      }
      throw error;
    }
  }

  if (fallbackError) {
    throw fallbackError;
  }

  throw new Error('No reading match found for this query.');
}

export default function DictionaryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedFromUrlRef = useRef(false);

  const [query, setQuery] = useState('猫');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedEndpoint, setDetectedEndpoint] = useState<EndpointKind | null>(null);
  const [activeReadingSlug, setActiveReadingSlug] = useState('');
  const [kanjiResult, setKanjiResult] = useState<KanjiResult | null>(null);
  const [wordResults, setWordResults] = useState<WordEntry[]>([]);
  const [readingResult, setReadingResult] = useState<ReadingResult | null>(null);

  const clearResults = useCallback(() => {
    setDetectedEndpoint(null);
    setKanjiResult(null);
    setWordResults([]);
    setReadingResult(null);
  }, []);

  const syncReadingInUrl = useCallback(
    (readingSlug: string) => {
      const normalized = normalizeReadingSlug(readingSlug);
      const params = new URLSearchParams(searchParams.toString());

      if (normalized) {
        params.set(READING_QUERY_PARAM, normalized);
      } else {
        params.delete(READING_QUERY_PARAM);
      }

      const nextUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const runSearch = useCallback(
    async (rawQuery: string, options: RunSearchOptions = {}) => {
      const trimmedQuery = rawQuery.trim();
      if (!trimmedQuery) {
        setError('Enter a search value first.');
        clearResults();
        syncReadingInUrl('');
        setActiveReadingSlug('');
        return;
      }

      setLoading(true);
      setError(null);
      clearResults();

      try {
        const kanjiCharacter = findFirstKanji(trimmedQuery);

        if (kanjiCharacter) {
          setDetectedEndpoint('kanji');
          setQuery(kanjiCharacter);

          const kanji = await fetchJson<KanjiResult>(
            `https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanjiCharacter)}`,
          );

          let words: WordEntry[] = [];
          try {
            words = await fetchJson<WordEntry[]>(`https://kanjiapi.dev/v1/words/${encodeURIComponent(kanjiCharacter)}`);
          } catch (wordError) {
            if (!(wordError instanceof Error) || !wordError.message.includes('No such endpoint')) {
              throw wordError;
            }
          }

          setKanjiResult(kanji);
          setWordResults(words);

          const urlReading =
            normalizeReadingSlug(options.preferredReadingSlug || activeReadingSlug) ||
            toReadingSlugFromKanjiResult(kanji);

          setActiveReadingSlug(urlReading);
          syncReadingInUrl(urlReading);
        } else {
          const readingCandidates = buildReadingCandidates(trimmedQuery);
          if (readingCandidates.length === 0) {
            throw new Error('Enter a kanji, kana, or romaji word (examples: 猫, ねこ, ネコ, neko).');
          }

          setDetectedEndpoint('reading');

          const { reading, resolvedReading } = await fetchReadingWithFallback(readingCandidates);
          setReadingResult(reading);
          setQuery(resolvedReading);

          const urlReading =
            normalizeReadingSlug(options.preferredReadingSlug || toReadingSlugFromInput(trimmedQuery)) ||
            toReadingSlugFromInput(resolvedReading);

          setActiveReadingSlug(urlReading);
          syncReadingInUrl(urlReading);
        }
      } catch (searchError) {
        const message = searchError instanceof Error ? searchError.message : 'Could not fetch data from kanjiapi.dev.';

        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [activeReadingSlug, clearResults, syncReadingInUrl],
  );

  useEffect(() => {
    if (initializedFromUrlRef.current) {
      return;
    }

    initializedFromUrlRef.current = true;

    const readingFromUrl = normalizeReadingSlug(searchParams.get(READING_QUERY_PARAM) ?? '');
    if (!readingFromUrl) {
      return;
    }

    setQuery(readingFromUrl);
    setActiveReadingSlug(readingFromUrl);
    void runSearch(readingFromUrl, { preferredReadingSlug: readingFromUrl });
  }, [runSearch, searchParams]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch(query);
  };

  const handleKanjiOptionClick = (kanjiCharacter: string) => {
    const preferredReading =
      normalizeReadingSlug(activeReadingSlug) || toReadingSlugFromInput(readingResult?.reading ?? '');
    void runSearch(kanjiCharacter, { preferredReadingSlug: preferredReading });
  };

  const mainKanjiOptions = uniqueValues(readingResult?.main_kanji ?? []);
  const nameKanjiOptions = uniqueValues(readingResult?.name_kanji ?? []);

  return (
    <div className="p-6 rounded-2xl bg-lumina-app-background min-h-full w-full">
      <h1 className="text-2xl font-semibold text-lumina-primary-text">Dictionary</h1>
      <p className="mt-1 text-sm text-lumina-secondary-text">Data source: kanjiapi.dev</p>

      <form onSubmit={submitSearch} className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kanji, kana, or romaji (e.g. 猫 / ねこ / neko)"
          className="w-full max-w-md rounded border border-lumina-border-divider px-3 py-2 text-sm bg-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-lumina-primary-teal bg-lumina-primary-teal text-black px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {detectedEndpoint ? (
        <p className="mt-2 text-xs text-lumina-secondary-text">
          Endpoint used: {detectedEndpoint === 'kanji' ? '/v1/kanji + /v1/words' : '/v1/reading'}
          {activeReadingSlug ? ` | URL reading: ${activeReadingSlug}` : ''}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-lumina-error">
          {error}
          {' If this is a browser CORS/network issue, then a server proxy would be required.'}
        </p>
      ) : null}

      {kanjiResult ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{kanjiResult.kanji}</span>
            <div className="text-sm text-lumina-secondary-text">
              <div>Unicode: U+{kanjiResult.unicode.toUpperCase()}</div>
              <div>Grade: {kanjiResult.grade ?? '-'}</div>
              <div>JLPT: {kanjiResult.jlpt ?? '-'}</div>
              <div>Strokes: {kanjiResult.stroke_count}</div>
            </div>
          </div>
          <p className="mt-3 text-sm">
            <span className="font-medium">Meanings:</span> {kanjiResult.meanings.join(', ') || '-'}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">Kun:</span> {kanjiResult.kun_readings.join(', ') || '-'}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">On:</span> {kanjiResult.on_readings.join(', ') || '-'}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">Name:</span> {kanjiResult.name_readings.join(', ') || '-'}
          </p>
        </section>
      ) : null}

      {wordResults.length > 0 ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-white p-4">
          <h2 className="text-lg font-medium text-lumina-primary-text">Words ({wordResults.length})</h2>
          <ul className="mt-3 space-y-3">
            {wordResults.slice(0, 10).map((entry, index) => {
              const variantText = entry.variants
                .map((variant) => (variant.pronounced ? `${variant.written} (${variant.pronounced})` : variant.written))
                .join(' / ');
              const meaningText = entry.meanings
                .map((meaning) => meaning.glosses.join(', '))
                .filter(Boolean)
                .join(' • ');

              return (
                <li key={`${variantText}-${index}`} className="border-b border-lumina-border-divider pb-2 text-sm">
                  <p className="font-medium text-lumina-primary-text">{variantText || 'Unknown variant'}</p>
                  <p className="text-lumina-secondary-text">{meaningText || 'No gloss available'}</p>
                </li>
              );
            })}
          </ul>
          {wordResults.length > 10 ? (
            <p className="mt-2 text-xs text-lumina-secondary-text">
              Showing first 10 results to keep the page lightweight.
            </p>
          ) : null}
        </section>
      ) : null}

      {readingResult ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-white p-4">
          <h2 className="text-lg font-medium text-lumina-primary-text">Reading: {readingResult.reading}</h2>
          <p className="mt-2 text-sm text-lumina-secondary-text">Click any kanji option to auto-search its meaning.</p>

          <div className="mt-3">
            <p className="text-sm font-medium">Main kanji</p>
            {mainKanjiOptions.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {mainKanjiOptions.map((kanjiCharacter) => (
                  <button
                    key={`main-${kanjiCharacter}`}
                    type="button"
                    onClick={() => handleKanjiOptionClick(kanjiCharacter)}
                    className="rounded border border-lumina-border-divider bg-lumina-app-background px-4 py-2 text-base"
                  >
                    {kanjiCharacter}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-lumina-secondary-text">-</p>
            )}
          </div>

          <div className="mt-3">
            <p className="text-sm font-medium">Name kanji</p>
            {nameKanjiOptions.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {nameKanjiOptions.map((kanjiCharacter) => (
                  <button
                    key={`name-${kanjiCharacter}`}
                    type="button"
                    onClick={() => handleKanjiOptionClick(kanjiCharacter)}
                    className="rounded border border-lumina-border-divider bg-lumina-app-background px-4 py-2 text-base"
                  >
                    {kanjiCharacter}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-lumina-secondary-text">-</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
