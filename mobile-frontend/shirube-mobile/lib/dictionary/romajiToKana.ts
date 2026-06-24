// Greedy longest-match romaji → hiragana converter. Direct port of
// `backend/src/search/romajiToKana.js`. Returns null when any character
// can't be mapped — that avoids false-positive kana conversions for
// English words like "dog" (where 'g' has no mapping and would
// otherwise yield a bare ど).

const ROMAJI_MAP: Record<string, string> = {
  // Vowels
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',

  // K-row
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  kya: 'きゃ', kyi: 'きぃ', kyu: 'きゅ', kye: 'きぇ', kyo: 'きょ',

  // S-row
  sa: 'さ', si: 'し', su: 'す', se: 'せ', so: 'そ',
  shi: 'し', sha: 'しゃ', shu: 'しゅ', she: 'しぇ', sho: 'しょ',
  sya: 'しゃ', syu: 'しゅ', syo: 'しょ',

  // T-row
  ta: 'た', ti: 'ち', tu: 'つ', te: 'て', to: 'と',
  chi: 'ち', tsu: 'つ',
  cha: 'ちゃ', chu: 'ちゅ', che: 'ちぇ', cho: 'ちょ',
  tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',

  // N-row
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  nya: 'にゃ', nyi: 'にぃ', nyu: 'にゅ', nye: 'にぇ', nyo: 'にょ',

  // H-row
  ha: 'は', hi: 'ひ', hu: 'ふ', he: 'へ', ho: 'ほ',
  fu: 'ふ',
  hya: 'ひゃ', hyi: 'ひぃ', hyu: 'ひゅ', hye: 'ひぇ', hyo: 'ひょ',

  // M-row
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  mya: 'みゃ', myi: 'みぃ', myu: 'みゅ', mye: 'みぇ', myo: 'みょ',

  // Y-row
  ya: 'や', yi: 'い', yu: 'ゆ', yo: 'よ',

  // R-row
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  rya: 'りゃ', ryi: 'りぃ', ryu: 'りゅ', rye: 'りぇ', ryo: 'りょ',

  // W-row
  wa: 'わ', wi: 'ゐ', we: 'ゑ', wo: 'を',

  // N (n' as explicit ん)
  "n'": 'ん',

  // G-row (dakuten)
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  gya: 'ぎゃ', gyi: 'ぎぃ', gyu: 'ぎゅ', gye: 'ぎぇ', gyo: 'ぎょ',

  // Z-row
  za: 'ざ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ji: 'じ', ja: 'じゃ', ju: 'じゅ', je: 'じぇ', jo: 'じょ',
  jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
  zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ',

  // D-row
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ',

  // B-row
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  bya: 'びゃ', byi: 'びぃ', byu: 'びゅ', bye: 'びぇ', byo: 'びょ',

  // P-row (handakuten)
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  pya: 'ぴゃ', pyi: 'ぴぃ', pyu: 'ぴゅ', pye: 'ぴぇ', pyo: 'ぴょ',

  // Special
  vu: 'ゔ',
};

const GEMINATE_CONSONANTS = new Set('bcdfghjklmpqrstvwxyz'.split(''));

const MAX_CHUNK = 4;

/**
 * Convert a romaji string to hiragana. Returns null if any character
 * couldn't be mapped — caller uses this to skip the kana-search path
 * for genuinely English input like "dog".
 */
export function romajiToKana(input: string): string | null {
  if (!input) return null;
  const s = input.toLowerCase().replace(/[\s'-]/g, '');
  if (s.length === 0) return null;

  let result = '';
  let i = 0;

  while (i < s.length) {
    // ── Geminate consonant (っ) ─────────────────────────────
    if (
      i + 1 < s.length &&
      s[i] === s[i + 1] &&
      GEMINATE_CONSONANTS.has(s[i])
    ) {
      result += 'っ';
      i += 1;
      continue;
    }

    // ── Standalone ん ────────────────────────────────────────
    if (
      s[i] === 'n' &&
      i + 1 < s.length &&
      s[i + 1] !== 'a' &&
      s[i + 1] !== 'i' &&
      s[i + 1] !== 'u' &&
      s[i + 1] !== 'e' &&
      s[i + 1] !== 'o' &&
      s[i + 1] !== 'y' &&
      s[i + 1] !== "'"
    ) {
      result += 'ん';
      i += 1;
      continue;
    }
    if (
      s[i] === 'm' &&
      i + 1 < s.length &&
      (s[i + 1] === 'b' || s[i + 1] === 'm' || s[i + 1] === 'p')
    ) {
      result += 'ん';
      i += 1;
      continue;
    }
    if (s[i] === 'n' && i + 1 === s.length) {
      result += 'ん';
      i += 1;
      continue;
    }

    // ── Greedy longest match ────────────────────────────────
    let matched = false;
    for (let len = Math.min(MAX_CHUNK, s.length - i); len >= 1; len--) {
      const chunk = s.substring(i, i + len);
      if (ROMAJI_MAP[chunk]) {
        result += ROMAJI_MAP[chunk];
        i += len;
        matched = true;
        break;
      }
    }

    if (!matched) return null;
  }

  return result.length > 0 ? result : null;
}
