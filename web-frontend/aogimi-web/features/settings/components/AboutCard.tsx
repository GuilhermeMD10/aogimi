import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PaperCard } from '@/shared/components';

const ROWS = [
  {
    href: '/help',
    label: 'Help',
    jp: '助け',
    description: 'What the app is, reading, the dictionary, decks, and how sync works.',
  },
  {
    href: '/credits',
    label: 'Credits',
    jp: '謝辞',
    description: 'The language data, typefaces, and open-source software this app ships.',
  },
] as const;

/**
 * The only entry points to Help and Credits. Real links to real routes — the
 * pages render the same settings shell, so navigating reads as the panel
 * column swapping in place.
 */
export function AboutCard() {
  return (
    <PaperCard>
      {ROWS.map((row, i) => (
        <Link
          key={row.href}
          href={row.href}
          className={
            'flex items-center gap-6 px-6 py-[18px] transition-colors duration-120 ease-[ease] hover:bg-(--paper-tile) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)' +
            (i > 0 ? ' border-t border-(--paper-bd)' : '')
          }
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-[9px]">
              <span className="text-[15px] font-bold text-(--ink)">{row.label}</span>
              <span className="font-[family-name:var(--face-jp)] text-[12px] text-(--faint)">
                {row.jp}
              </span>
            </span>
            <span className="mt-[3px] block text-[13px] leading-[1.45] text-(--muted)">
              {row.description}
            </span>
          </span>
          <ChevronRight aria-hidden size={18} strokeWidth={1.7} className="shrink-0 text-(--faint)" />
        </Link>
      ))}
    </PaperCard>
  );
}
