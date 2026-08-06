import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { GLASS_ROW } from '@/shared/components';
import { cn } from '@/lib/util/cn';

type Props = {
  href: string;
  label: string;
  jp: string;
  description: string;
};

/**
 * One navigation row in the settings list — the only entry points to Help and
 * Credits. Real links to real routes; `SettingsList` supplies the entries and
 * the rule above each one.
 *
 * `GLASS_ROW` rather than a `hover:bg-*` utility: it is the list-row treatment,
 * so the hover fill matches every other ruled glass list in the app instead of
 * paper's tile colour.
 */
export function AboutRow({ href, label, jp, description }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        GLASS_ROW,
        'flex items-center gap-6 px-6 py-[18px]',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-[9px]">
          <span className="text-[15px] font-bold text-(--ink)">{label}</span>
          <span className="font-[family-name:var(--face-jp)] text-[12px] text-(--faint)">{jp}</span>
        </span>
        <span className="mt-[3px] block text-[13px] leading-[1.45] text-(--muted)">
          {description}
        </span>
      </span>
      <ChevronRight aria-hidden size={18} strokeWidth={1.7} className="shrink-0 text-(--faint)" />
    </Link>
  );
}
