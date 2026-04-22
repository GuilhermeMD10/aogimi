// Seed book text for Phase 3A before the real EPUB reader lands.
// Returns paragraphs of Japanese text. Keyed by book id when we have a
// recognized title; falls back to a generic Kokoro excerpt.

export type SeedChapter = {
  id: string;
  label: string;
  paragraphs: string[];
};

const KOKORO: SeedChapter = {
  id: 'kokoro-ch1',
  label: '上・一',
  paragraphs: [
    '私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。',
    'これは世間を憚かる遠慮というよりも、その方が私にとって自然だからである。',
    '私はその人の記憶を呼び起すごとに、すぐ「先生」といいたくなる。',
    '私が先生と知り合いになったのは鎌倉である。その時私はまだ若々しい書生であった。',
    '暑中休暇を利用して海水浴に行った友達からぜひ来いという端書を受け取ったので、私は多少の金を工面して、出掛ける事にした。',
    '私は金の工面に二、三日を費やした。ところが私が鎌倉に着いて三日と経たないうちに、私を呼び寄せた友達は、急に国元から帰れという電報を受け取った。',
  ],
};

const GINGA: SeedChapter = {
  id: 'ginga-ch1',
  label: '第一章',
  paragraphs: [
    'ジョバンニが学校の門を出るときには、もうよほど暗くなっていました。',
    '風がさっと吹いてきて、木の葉が大きく揺れました。',
    '「銀河の祭はもう始まっているよ。」と誰かがささやくように言いました。',
  ],
};

const SEEDS: Record<string, SeedChapter> = {
  kokoro: KOKORO,
  'こゝろ': KOKORO,
  こころ: KOKORO,
  ginga: GINGA,
  銀河鉄道の夜: GINGA,
};

export function seedChapterFor(titleOrKey: string): SeedChapter {
  const direct = SEEDS[titleOrKey];
  if (direct) return direct;
  // Match by substring so 'こゝろ' variants all land on Kokoro.
  for (const key of Object.keys(SEEDS)) {
    if (titleOrKey.includes(key) || key.includes(titleOrKey)) return SEEDS[key]!;
  }
  return KOKORO;
}
