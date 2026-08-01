'use client';

// `/reader` — the library shelf. Composition, geometry and the client-side
// filter; it fetches nothing. `BooksView` owns the data and every handler, this
// arranges the tiles in `LibraryCards` and the empty state in `LibraryEmpty`.
//
// Two states, not the handoff's three. A book whose file is missing renders as a
// <ReimportCard> inside the normal grid, so "re-import" is a property of a tile
// rather than a screen you have to get out of:
//
//   no books at all   → <LibraryEmpty>
//   anything else     → header · chips · hero · grid
//
// `TopBar` is rendered here rather than in the layout, the way `Home` does it:
// shared chrome that a page opts into, so screens that haven't been redesigned
// don't inherit it and it lines up with this column's content.

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Plus, Search } from 'lucide-react';
import { Button, Card, Skeleton } from '@/shared/components';
import { TopBar } from '@/features/app-shell/TopBar';
import { cn } from '@/lib/util/cn';
import type { Book } from '@/features/books/types';
import { BookCard, ContinueReadingCard, HAIRLINE, ReimportCard } from './LibraryCards';
import { LibraryEmpty } from './LibraryEmpty';

const FILTERS = ['all', 'reading', 'new', 'finished'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  reading: 'Reading',
  new: 'New',
  finished: 'Finished',
};

const EMPTY_FOR_FILTER: Record<Filter, string> = {
  all: 'Nothing here yet.',
  reading: 'Nothing in progress.',
  new: 'No unstarted books.',
  finished: 'No finished books yet.',
};

const GRID = 'grid grid-cols-3 gap-6 min-[900px]:grid-cols-4 min-[1100px]:grid-cols-5';

function matchesFilter(book: Book, filter: Filter): boolean {
  switch (filter) {
    case 'reading':
      return book.progress > 0 && book.progress < 100;
    case 'new':
      return book.progress === 0;
    case 'finished':
      return book.progress >= 100;
    default:
      return true;
  }
}

export type LibraryShelfProps = {
  books: Book[];
  loading: boolean;
  importing: boolean;
  /** Something went wrong. Rendered under the header, vermilion edge. */
  error?: string | null;
  /** Transient confirmation ("Already in your library…"). Dismissible. */
  notice?: string | null;
  onDismissNotice?: () => void;
  onImport: () => void;
  onOpen: (book: Book) => void;
  onLocate: (book: Book) => void;
  onRename: (book: Book, title: string) => void;
  onMarkFinished: (book: Book) => void;
  onRemove: (book: Book) => void;
  /** Below the grid — the filesystem-access banner. */
  footer?: React.ReactNode;
};

export function LibraryShelf({
  books,
  loading,
  importing,
  error,
  notice,
  onDismissNotice,
  onImport,
  onOpen,
  onLocate,
  onRename,
  onMarkFinished,
  onRemove,
  footer,
}: LibraryShelfProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // The filter lives in the URL so it survives a reload and can be linked to.
  const raw = searchParams.get('filter');
  const filter: Filter = FILTERS.includes(raw as Filter) ? (raw as Filter) : 'all';

  const setFilter = (next: Filter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('filter');
    else params.set('filter', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // `/` focuses search from anywhere on the page, unless you're already typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Newest-read first; books never opened sink to the bottom keeping their
  // merged order.
  const sorted = useMemo(
    () =>
      [...books].sort((a, b) => {
        const ta = a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0;
        const tb = b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0;
        return tb - ta;
      }),
    [books],
  );

  const hero = sorted.find((b) => b.lastReadAt && b.progress > 0 && b.progress < 100) ?? null;

  const counts = useMemo(
    () =>
      FILTERS.reduce(
        (acc, f) => ({ ...acc, [f]: books.filter((b) => matchesFilter(b, f)).length }),
        {} as Record<Filter, number>,
      ),
    [books],
  );

  const q = query.trim().toLowerCase();
  const grid = useMemo(
    () =>
      sorted
        .filter((b) => b.id !== hero?.id)
        .filter((b) => (q ? `${b.title} ${b.author}`.toLowerCase().includes(q) : true))
        .filter((b) => matchesFilter(b, filter)),
    [sorted, hero?.id, q, filter],
  );

  const isEmpty = !loading && books.length === 0;

  return (
    <div className="h-full w-full overflow-auto font-[family-name:var(--face-ui)] font-medium">
      <div className="mx-auto w-full max-w-[1300px] px-11 pt-[34px] pb-[140px]">
        <TopBar />

        <div className="mb-[22px] flex items-center justify-between gap-6">
          <div className="flex items-center gap-[11px]">
            <BookOpen size={24} strokeWidth={1.7} className="shrink-0 text-(--ink)" />
            <h1 className="text-[23px] font-bold tracking-[-0.01em] text-(--ink)">Your library</h1>
          </div>

          {!isEmpty && (
            <div className="flex shrink-0 items-center gap-2">
              <SearchField inputRef={searchRef} value={query} onChange={setQuery} />
              <Button icon={<Plus size={16} strokeWidth={1.9} />} onClick={onImport}>
                {importing ? 'Importing…' : 'Import book'}
              </Button>
            </div>
          )}
        </div>

        {error && <Banner tone="error">{error}</Banner>}
        {!error && notice && (
          <Banner tone="notice" onDismiss={onDismissNotice}>
            {notice}
          </Banner>
        )}

        {loading ? (
          <ShelfSkeleton />
        ) : isEmpty ? (
          <LibraryEmpty onImport={onImport} importing={importing} />
        ) : (
          <>
            {hero && (
              <ContinueReadingCard
                book={hero}
                onResume={() => onOpen(hero)}
                onLocate={() => onLocate(hero)}
                onRename={(title) => onRename(hero, title)}
                onRemove={() => onRemove(hero)}
              />
            )}

            <div className="mt-8 mb-[18px] flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <FilterChip
                  key={f}
                  label={FILTER_LABEL[f]}
                  count={counts[f]}
                  active={filter === f}
                  onClick={() => setFilter(f)}
                />
              ))}
            </div>

            {/* The shelf area always stays — a filter with no matches softens to
                a line, it never collapses. */}
            {grid.length > 0 ? (
              <div className={GRID}>
                {grid.map((book) =>
                  book.available ? (
                    <BookCard
                      key={book.id}
                      book={book}
                      onOpen={() => onOpen(book)}
                      onRename={(title) => onRename(book, title)}
                      onMarkFinished={() => onMarkFinished(book)}
                      onRemove={() => onRemove(book)}
                    />
                  ) : (
                    <ReimportCard
                      key={book.id}
                      book={book}
                      onReAdd={() => onLocate(book)}
                      onRename={(title) => onRename(book, title)}
                      onRemove={() => onRemove(book)}
                    />
                  ),
                )}
              </div>
            ) : (
              <p className="text-[13.5px] text-(--muted)">
                {q ? 'Nothing matches that search.' : EMPTY_FOR_FILTER[filter]}
              </p>
            )}
          </>
        )}

        {footer && <div className="mt-8">{footer}</div>}
      </div>
    </div>
  );
}

// ── Banner ──────────────────────────────────────────────────────────────────

// The handoff's notice-bar shape — hairline box with a 3px coloured left edge —
// reused for both tones. Vermilion is the design's `--danger` as well as its
// `--accent`, so an error reads as urgent without a second red entering the
// palette; a confirmation takes the neutral `--btn` edge instead.
function Banner({
  tone,
  children,
  onDismiss,
}: {
  tone: 'error' | 'notice';
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mb-[22px] flex items-center gap-3 rounded-(--radius-button) border border-l-[3px] px-[18px] py-3.5',
        'text-[13.5px] leading-[1.5] text-(--soft)',
        HAIRLINE,
        tone === 'error' ? 'border-l-(--accent)' : 'border-l-(--btn)',
      )}
    >
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'shrink-0 cursor-pointer font-[family-name:var(--face-mono)] text-[11px] tracking-[0.14em] uppercase',
            'text-(--faint) transition-colors duration-120 hover:text-(--ink)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

// ── Header search ───────────────────────────────────────────────────────────

function SearchField({
  inputRef,
  value,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className={cn(
        'inline-flex min-w-[220px] items-center gap-2 rounded-(--radius-input) border px-2.5 py-2',
        HAIRLINE,
      )}
    >
      <Search size={14} className="shrink-0 text-(--faint)" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search title or author"
        aria-label="Search your library"
        className="min-w-0 flex-1 bg-transparent text-[13px] text-(--ink) outline-none placeholder:text-(--faint)"
      />
      <kbd
        className={cn(
          'rounded-[4px] border px-1.5 font-[family-name:var(--face-mono)] text-[10px] text-(--faint)',
          HAIRLINE,
        )}
      >
        /
      </kbd>
    </div>
  );
}

// ── Filter chip ─────────────────────────────────────────────────────────────

// Not the shared `Chip`: that one is a link or a static label, and these are
// single-select controls with a pressed state and their own mono type scale.
function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-(--radius-chip) border-[1.5px] px-[13px] py-[7px]',
        'font-[family-name:var(--face-mono)] text-[11px] tracking-[0.08em] uppercase',
        'transition-[background-color,color,border-color] duration-[180ms] ease-[ease]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        active
          ? 'border-(--btn) bg-(--btn) text-(--btn-ink)'
          : cn('bg-transparent text-(--soft) hover:border-(--gold)', HAIRLINE),
      )}
    >
      {label}
      <span className="text-[10.5px] opacity-70">{count}</span>
    </button>
  );
}

// ── Loading ─────────────────────────────────────────────────────────────────

// Cover blocks only, at the real aspect ratio, and the hero reserves its height
// — so nothing shifts when the shelf arrives. The header and chips above have
// already rendered by this point; there is never a full-page spinner.
function ShelfSkeleton() {
  return (
    <>
      <Card className="flex gap-[22px]">
        <Skeleton className="h-[152px] w-[104px] shrink-0" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="mt-auto h-[26px] w-full" />
        </div>
      </Card>

      <div className={cn(GRID, 'mt-8')}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="aspect-[96/140] w-full rounded-(--radius-cover)" />
        ))}
      </div>
    </>
  );
}
