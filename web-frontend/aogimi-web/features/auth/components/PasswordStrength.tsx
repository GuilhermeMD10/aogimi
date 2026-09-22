import { cn } from '@/lib/util/cn';
import { passwordStrength, type PasswordStrength as Level } from '../lib/passwordStrength';

/** What each non-empty level says and paints. The handoff's red / amber /
 *  green become the palette's `danger` / `accent-mid` / `good`, so the meter
 *  follows the theme like everything else; in Clear Sky those collapse to one
 *  hue, which is why the label is always drawn (README's own note on that
 *  theme: never rely on colour alone). */
const LEVELS: Record<Exclude<Level, 0>, { label: string; fill: string; ink: string }> = {
  1: { label: 'Weak', fill: 'bg-(--danger)', ink: 'text-(--danger)' },
  2: { label: 'Fair', fill: 'bg-(--accent-mid)', ink: 'text-(--accent)' },
  3: { label: 'Strong', fill: 'bg-(--good)', ink: 'text-(--good)' },
  4: { label: 'Strong', fill: 'bg-(--good)', ink: 'text-(--good)' },
};

/**
 * The four-segment strength meter under the sign-up password field: 5px
 * segments, 5px apart, filled up to the level; the label to the right at
 * 11/700 uppercase. A `meter` to assistive tech, with the label as its text.
 */
export function PasswordStrength({ password }: { password: string }) {
  const level = passwordStrength(password);
  const meta = level === 0 ? null : LEVELS[level];

  return (
    <div
      role="meter"
      aria-label="Password strength"
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={level}
      aria-valuetext={meta ? meta.label : 'Empty'}
      className="mt-0.5 flex items-center gap-2.5"
    >
      <div className="flex flex-1 gap-[5px]">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            aria-hidden
            className={cn(
              'h-[5px] flex-1 rounded-full transition-colors duration-120',
              meta && segment <= level ? meta.fill : 'bg-[rgb(var(--line-rgb)/0.10)]',
            )}
          />
        ))}
      </div>
      {/* Reserved so the row keeps its width whether or not a label shows. */}
      <span
        className={cn(
          'min-w-[52px] text-right font-[family-name:var(--face-ui)] text-[11px] leading-none font-bold tracking-[0.04em] uppercase',
          meta ? meta.ink : 'text-transparent',
        )}
      >
        {meta ? meta.label : 'Empty'}
      </span>
    </div>
  );
}
