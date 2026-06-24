const CONSONANT_REGEX = /[bcdfghjklmnpqrstvwxyz]/;

const ROMAJI_MAP_THREE: Record<string, string> = {
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ',
  sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ',
  tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  shi: 'し', chi: 'ち', tsu: 'つ',
};

const ROMAJI_MAP_TWO: Record<string, string> = {
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  sa: 'さ', su: 'す', se: 'せ', so: 'そ',
  ta: 'た', te: 'て', to: 'と',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', he: 'へ', ho: 'ほ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  za: 'ざ', ja: 'じゃ', ju: 'じゅ', jo: 'じょ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  da: 'だ', de: 'で', do: 'ど',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
  va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
};

const ROMAJI_MAP_ONE: Record<string, string> = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
};

const HIRAGANA_TO_ROMAJI: Record<string, string> = {
  ...Object.fromEntries(Object.entries(ROMAJI_MAP_THREE).map(([r, k]) => [k, r])),
  ...Object.fromEntries(Object.entries(ROMAJI_MAP_TWO).map(([r, k]) => [k, r])),
  ...Object.fromEntries(Object.entries(ROMAJI_MAP_ONE).map(([r, k]) => [k, r])),
  ん: 'n',
};

export const isKanjiCharacter = (value: string): boolean => /\p{Script=Han}/u.test(value);
export const isKanaReading = (value: string): boolean => /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(value);
export const isRomajiReading = (value: string): boolean => /^[a-zA-Z]+$/.test(value);
export const hasHiragana = (value: string): boolean => /[\u3041-\u3096]/u.test(value);
export const hasKatakana = (value: string): boolean => /[\u30A1-\u30FA]/u.test(value);

export const normalizeReadingSlug = (value: string): string => value.toLowerCase().replace(/[^a-z]/g, '');

export const toKatakana = (value: string): string =>
  value.replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));

export const toHiragana = (value: string): string =>
  value.replace(/[\u30A1-\u30FA]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

export function romajiToHiragana(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  if (!normalized || !isRomajiReading(normalized)) return null;

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
      if (!next || next === 'n' || !/[aiueoy]/.test(next)) {
        result += 'ん';
        index += 1;
        continue;
      }
    }

    const three = normalized.slice(index, index + 3);
    if (three in ROMAJI_MAP_THREE) { result += ROMAJI_MAP_THREE[three]; index += 3; continue; }

    const two = normalized.slice(index, index + 2);
    if (two in ROMAJI_MAP_TWO) { result += ROMAJI_MAP_TWO[two]; index += 2; continue; }

    const one = normalized[index];
    if (one in ROMAJI_MAP_ONE) { result += ROMAJI_MAP_ONE[one]; index += 1; continue; }

    return null;
  }

  return result;
}

export function kanaToRomaji(input: string): string {
  const normalized = toHiragana(input).replace(/[^\p{Script=Hiragana}ー]/gu, '');

  let result = '';
  let index = 0;
  let hasGeminate = false;

  while (index < normalized.length) {
    const current = normalized[index];

    if (current === 'っ') { hasGeminate = true; index += 1; continue; }

    if (current === 'ー') {
      const lastVowel = result.match(/[aeiou](?=[^aeiou]*$)/)?.[0];
      if (lastVowel) result += lastVowel;
      index += 1;
      continue;
    }

    const twoKana = normalized.slice(index, index + 2);
    let romaji = HIRAGANA_TO_ROMAJI[twoKana];

    if (romaji) {
      index += 2;
    } else {
      romaji = HIRAGANA_TO_ROMAJI[normalized[index]];
      index += 1;
    }

    if (!romaji) { hasGeminate = false; continue; }

    if (hasGeminate && CONSONANT_REGEX.test(romaji[0])) result += romaji[0];
    result += romaji;
    hasGeminate = false;
  }

  return normalizeReadingSlug(result);
}

export function toReadingSlugFromInput(input: string): string {
  const trimmed = input.trim();
  if (isRomajiReading(trimmed)) return normalizeReadingSlug(trimmed);
  if (isKanaReading(trimmed)) return kanaToRomaji(trimmed);
  return '';
}

export function buildReadingCandidates(input: string): string[] {
  if (isKanaReading(input)) {
    if (hasHiragana(input)) return uniqueValues([input, toKatakana(input)]);
    if (hasKatakana(input)) return uniqueValues([input, toHiragana(input)]);
    return [input];
  }

  if (isRomajiReading(input)) {
    const hiragana = romajiToHiragana(input);
    if (!hiragana) return [];
    return uniqueValues([hiragana, toKatakana(hiragana)]);
  }

  return [];
}

export function findFirstKanji(input: string): string | null {
  return Array.from(input).find((ch) => isKanjiCharacter(ch)) ?? null;
}

export function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
