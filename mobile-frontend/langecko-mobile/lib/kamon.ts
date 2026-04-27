export type KamonOption = {
  char: string;
  label: string;
};

export const KAMON_SET: KamonOption[] = [
  { char: '波', label: 'nami · wave' },
  { char: '桜', label: 'sakura · blossom' },
  { char: '月', label: 'tsuki · moon' },
  { char: '龍', label: 'ryū · dragon' },
  { char: '虎', label: 'tora · tiger' },
  { char: '鶴', label: 'tsuru · crane' },
  { char: '梅', label: 'ume · plum' },
  { char: '竹', label: 'take · bamboo' },
  { char: '松', label: 'matsu · pine' },
  { char: '山', label: 'yama · mountain' },
  { char: '川', label: 'kawa · river' },
  { char: '風', label: 'kaze · wind' },
  { char: '火', label: 'hi · fire' },
  { char: '星', label: 'hoshi · star' },
  { char: '雷', label: 'kaminari · thunder' },
  { char: '狐', label: 'kitsune · fox' },
];

export function kamonFor(index: number): KamonOption {
  return KAMON_SET[((index % KAMON_SET.length) + KAMON_SET.length) % KAMON_SET.length]!;
}
