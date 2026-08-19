'use client';

// The Contents popover. Same shell as Display, taller and tighter.
//
// Foliate's TOC gives one label per entry and no per-chapter page count, so a
// row is the number (its flattened position, which is derived rather than
// invented) and the label.
//
// The current chapter is marked from the label foliate already reports on every
// relocate.

import { HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { ReaderPanel } from './ReaderShell';

export type NavItem = {
  label: string;
  href: string;
  subitems?: NavItem[];
};

function Row({
  n,
  item,
  depth,
  current,
  onNavigate,
}: {
  n: number;
  item: NavItem;
  depth: number;
  current: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.href)}
      aria-current={current ? 'true' : undefined}
      style={{ paddingLeft: 10 + depth * 12 }}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-(--radius-button) border-l-[3px] py-[11px] pr-2.5 text-left',
        'transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        current
          ? 'border-l-(--accent) bg-(--track)'
          : 'border-l-transparent hover:bg-(--track)',
      )}
    >
      <span
        className={cn(
          'shrink-0 font-[family-name:var(--face-mono)] text-xs',
          current ? 'text-(--accent)' : 'text-(--faint)',
        )}
      >
        {String(n).padStart(2, '0')}
      </span>
      <span className="min-w-0 flex-1 truncate font-[family-name:var(--face-jp)] text-[15px] text-(--ink)">
        {item.label}
      </span>
    </button>
  );
}

/** Depth-first walk so the visible numbering matches reading order, nesting
 *  included. */
function flatten(
  items: NavItem[],
  depth = 0,
  out: { item: NavItem; depth: number }[] = [],
): { item: NavItem; depth: number }[] {
  for (const item of items) {
    out.push({ item, depth });
    if (item.subitems?.length) flatten(item.subitems, depth + 1, out);
  }
  return out;
}

export function ContentsPanel({
  items,
  currentLabel,
  onNavigate,
  onClose,
}: {
  items: NavItem[];
  /** Label of the chapter being read, from foliate's relocate. */
  currentLabel?: string;
  onNavigate: (href: string) => void;
  onClose: () => void;
}) {
  const rows = flatten(items);

  return (
    <ReaderPanel
      title="Contents"
      subtitle="目次"
      onClose={onClose}
      className={cn(
        'max-h-[calc(100vh-100px)] w-[330px] overflow-y-auto px-4 pt-[18px] pb-3.5',
        HAIRLINE,
      )}
    >
      {rows.length > 0 ? (
        <div className="flex flex-col">
          {rows.map(({ item, depth }, i) => (
            <Row
              key={`${item.href}-${item.label}-${i}`}
              n={i + 1}
              item={item}
              depth={depth}
              current={Boolean(currentLabel) && item.label === currentLabel}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : (
        <p className="px-2.5 py-2 text-[13.5px] text-(--muted)">This file has no contents.</p>
      )}
    </ReaderPanel>
  );
}
