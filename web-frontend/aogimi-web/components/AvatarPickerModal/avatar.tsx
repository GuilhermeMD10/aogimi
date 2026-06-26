'use client';

// Shared avatar primitives used by AvatarPickerModal and the profile page.

export const KAMON_SET = [
  { k: '波', label: 'nami · wave' },
  { k: '桜', label: 'sakura · blossom' },
  { k: '月', label: 'tsuki · moon' },
  { k: '龍', label: 'ryū · dragon' },
  { k: '虎', label: 'tora · tiger' },
  { k: '鶴', label: 'tsuru · crane' },
  { k: '梅', label: 'ume · plum' },
  { k: '竹', label: 'take · bamboo' },
  { k: '松', label: 'matsu · pine' },
  { k: '山', label: 'yama · mountain' },
  { k: '川', label: 'kawa · river' },
  { k: '風', label: 'kaze · wind' },
  { k: '火', label: 'hi · fire' },
  { k: '星', label: 'hoshi · star' },
  { k: '雷', label: 'kaminari · thunder' },
  { k: '狐', label: 'kitsune · fox' },
];

export function Kamon({
  char,
  size = 48,
  active,
  onClick,
}: {
  char: string;
  size?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative flex shrink-0 items-center justify-center rounded-full ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={{
        width: size,
        height: size,
        background: 'var(--lgc-bg-elev)',
        border: active ? '2px solid var(--lgc-accent)' : '1px solid var(--lgc-border)',
        boxShadow: active ? '0 0 0 3px color-mix(in oklab, var(--lgc-accent) 25%, transparent)' : 'none',
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          inset: 4,
          border: '1px dashed color-mix(in oklab, currentColor 12%, transparent)',
        }}
      />
      <div
        className="text-lgc-fg font-display"
        style={{ fontSize: size * 0.5, lineHeight: 1 }}
      >
        {char}
      </div>
    </div>
  );
}
