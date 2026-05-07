'use client';

import { SectionCard } from '@/components/ui/SectionCard';
import type { BookProgressRecord } from '@/lib/booksApi';

export function CurrentlyReadingSection({ books }: { books: BookProgressRecord[] }) {
  return (
    <SectionCard
      title="Currently reading"
      subtitle={`${books.length} book${books.length !== 1 ? 's' : ''}`}
    >
      {books.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {books.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-lg border border-lgc-border bg-lgc-bg-elev px-3 py-2.5"
            >
              <div
                className="h-10.5 w-7.5 shrink-0 rounded-sm"
                style={{ background: b.cover_color }}
              />
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-[13px] font-medium text-lgc-fg font-display"
                >
                  {b.title}
                </div>
                <div className="mb-1 text-[11px] text-lgc-fg-muted">{b.author}</div>
                <div className="flex items-center gap-1.5">
                  <div className="h-0.75 flex-1 rounded-full bg-lgc-bg-sunken">
                    <div
                      className="h-full rounded-full bg-lgc-accent"
                      style={{ width: `${b.progress}%` }}
                    />
                  </div>
                  <span
                    className="text-[10px] text-lgc-fg-muted font-mono"
                  >
                    {b.progress}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-lgc-fg-muted">No books in progress.</p>
      )}
    </SectionCard>
  );
}
