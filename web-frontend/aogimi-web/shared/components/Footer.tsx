import Link from 'next/link';
import { cn } from '@/lib/util/cn';

type Variant = 'standard' | 'dictionary';

type Props = {
  variant?: Variant;
  /** The current theme's display name (`THEMES[theme].name`, the same string
   *  as its `--theme-name` token). Passed in because this sits below
   *  `features/`, where the theme provider lives. */
  themeName: string;
  className?: string;
};

/** Where the three links go (PLAN §3 G13, cheapest build). */
const LINKS: Record<Variant, { label: string; href: string }[]> = {
  standard: [
    { label: 'SRS Review Deck', href: '/sky' },
    { label: 'Reader Library', href: '/' },
    { label: 'Keyboard Shortcuts', href: '/help#shortcuts' },
  ],
  dictionary: [
    { label: 'Vocabulary SRS', href: '/sky' },
    { label: 'Kanji Radicals', href: '/dictionary' },
    { label: 'Literature Corpus', href: '/' },
  ],
};

/**
 * The page footer (README → Shared shell → Footer). `standard` on the Library
 * and Study Finished; `dictionary` on the Dictionary lookup page (page 02).
 */
export function Footer({ variant = 'standard', themeName, className }: Props) {
  return (
    <footer
      className={cn(
        'shrink-0 border-t border-(--hairline) bg-(--pane-footer) px-24 pt-6 pb-8',
        'font-[family-name:var(--face-ui)]',
        className,
      )}
    >
      {/* The wash and hairline run edge to edge; the row inside stops at the
          frame's 1980px content cap. */}
      <div className="mx-auto flex w-full max-w-[1980px] items-center justify-between gap-6">
      <div className="flex items-center gap-2.5 text-[13px] font-medium text-(--ink-2)">
        {variant === 'standard' ? (
          <>
            <span
              aria-hidden
              className="flex size-[22px] items-center justify-center rounded-full bg-(--accent) font-[family-name:var(--face-jp)] text-[11px] font-bold text-(--on-accent)"
            >
              仰
            </span>
            <span>Aogimi Immersion System — {themeName}</span>
          </>
        ) : (
          <>
            <span aria-hidden className="font-[family-name:var(--face-jp)] text-[15px] font-bold text-(--accent)">
              仰
            </span>
            <span>
              © {new Date().getFullYear()} Aogimi Japanese Immersion. {themeName}.
            </span>
          </>
        )}
      </div>

      <nav aria-label="Footer" className="flex items-center gap-[22px]">
        {LINKS[variant].map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="text-[13px] font-medium text-(--ink) transition-colors duration-120 ease-[ease] hover:text-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      </div>
    </footer>
  );
}
