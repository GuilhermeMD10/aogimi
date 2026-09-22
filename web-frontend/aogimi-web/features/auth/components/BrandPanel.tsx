import { PANE, StarField } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { AuthMode } from '../types';

/**
 * The auth card's left panel (auth handoff → Brand panel): the mode's 158°
 * gradient (`--pane-auth-login` / `--pane-auth-signup`), the seeded star
 * field, the 64px brand mark, a headline, its Japanese line and three pillar
 * rows. Decorative — nothing here is interactive.
 *
 * The pillars are the same three rows in both modes. The handoff's sign-in
 * rows carry live figures (`14 BOOKS`, `1,420 STARS · 28 DUE`) that a
 * signed-out screen cannot know, so both modes draw the sign-up set, which
 * describes the product rather than an account.
 *
 * Below `lg` the panel is the handoff's short strip: mark + headline only.
 */

const COPY: Record<AuthMode, { headline: string; sub: string }> = {
  login: { headline: "Read Japanese the way you'd read anything else.", sub: '仰ぎ見る — to look up at' },
  signup: { headline: 'Every word you look up becomes a star.', sub: '空を満たそう — fill your sky' },
};

const PILLARS = [
  { mark: '辞', label: 'Look up in one tap', meta: 'Inline dictionary' },
  { mark: '読', label: 'Read real literature', meta: 'Furigana · N5–N1' },
  { mark: '空', label: 'Review as constellations', meta: 'SRS scheduling' },
];

const JP = 'font-[family-name:var(--face-jp)]';

export function BrandPanel({ mode }: { mode: AuthMode }) {
  const { headline, sub } = COPY[mode];

  return (
    <div
      aria-hidden
      className="relative flex flex-col justify-between gap-6 overflow-hidden px-6 py-6 text-(--ink) lg:gap-9 lg:px-10 lg:py-11"
      style={{ background: `var(--pane-auth-${mode})` }}
    >
      <StarField count={26} className="absolute inset-0" />

      <div className="relative flex items-center gap-4 lg:flex-col lg:items-start lg:gap-[22px]">
        <span
          className={cn(
            PANE,
            JP,
            'flex size-11 shrink-0 items-center justify-center rounded-full text-[20px] font-bold text-(--accent) shadow-(--shadow-hero)',
            'lg:size-16 lg:text-[28px]',
          )}
        >
          仰
        </span>
        <div className="flex flex-col gap-3">
          <p className="m-0 font-[family-name:var(--face-ui)] text-[22px] leading-[1.16] font-bold tracking-[-0.02em] text-pretty lg:text-[30px]">
            {headline}
          </p>
          <p className={cn(JP, 'm-0 hidden text-[16px] font-medium text-(--ink-2) lg:block')}>{sub}</p>
        </div>
      </div>

      <ul className="relative m-0 hidden list-none flex-col gap-3.5 p-0 lg:flex">
        {PILLARS.map((p) => (
          <li key={p.mark} className="flex items-center gap-3">
            <span
              className={cn(
                PANE,
                JP,
                'flex size-[34px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-(--accent)',
              )}
            >
              {p.mark}
            </span>
            <span className="font-[family-name:var(--face-ui)] text-[14px] font-medium">{p.label}</span>
            <span className="font-[family-name:var(--face-mono)] text-[11px] tracking-[0.04em] uppercase text-(--ink-2)">
              {p.meta}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
