// Pitch-accent helpers — mirror of web's lib/util/pitch.ts.
//
// Kanjium ships positions as strings like "0", "1", "2,3". A position of 0
// means heiban (flat). A position of N drops the pitch *after* the N-th mora;
// when N equals the mora count, the drop lands on the following particle
// (odaka).

const SMALL_KANA = new Set([
  'ゃ', 'ゅ', 'ょ', 'ゎ',
  'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ',
  'ャ', 'ュ', 'ョ', 'ヮ',
  'ァ', 'ィ', 'ゥ', 'ェ', 'ォ',
]);

export function splitMora(kana: string): string[] {
  const mora: string[] = [];
  for (const ch of kana) {
    if (SMALL_KANA.has(ch) && mora.length > 0) {
      mora[mora.length - 1] += ch;
    } else {
      mora.push(ch);
    }
  }
  return mora;
}

export function parsePitchPositions(raw: string | null | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

export type PitchPattern = {
  states: ('H' | 'L')[];
  dropAfter: number | null;
  isOdaka: boolean;
};

export function pitchPattern(moraCount: number, position: number): PitchPattern {
  if (moraCount <= 0) {
    return { states: [], dropAfter: null, isOdaka: false };
  }
  const states: ('H' | 'L')[] = new Array(moraCount).fill('L');
  if (position === 0) {
    for (let i = 1; i < moraCount; i++) states[i] = 'H';
    return { states, dropAfter: null, isOdaka: false };
  }
  if (position === 1) {
    states[0] = 'H';
    return { states, dropAfter: 1, isOdaka: false };
  }
  const cap = Math.min(position, moraCount);
  for (let i = 1; i < cap; i++) states[i] = 'H';
  if (position >= moraCount) {
    return { states, dropAfter: null, isOdaka: true };
  }
  return { states, dropAfter: position, isOdaka: false };
}
