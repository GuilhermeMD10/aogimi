'use client';

// `/` — the library shelf (page 01), and the app's landing page. Composition,
// geometry and the client-side filter; it fetches nothing. `BooksView` owns the
// data and every handler, this arranges the tiles in `LibraryCards` and the
// empty state in `LibraryEmpty`.
//
// The page scrolls as a page (`frameForRoute`'s `flow: 'page'`): header row →
// hero → search + filter → shelf → the frame's footer.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Plus } from 'lucide-react';
import {
  Button,
  Eyebrow,
  HeroCard,
  Kbd,
  PANE,
  PRESS,
  SearchBar,
  Segmented,
  Skeleton,
  ACTIVE,
} from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { Book } from '@/features/books/types';
import { BookCover, BookRow, HeroBook, ReimportCard } from './LibraryCards';
import { LibraryEmpty } from './LibraryEmpty';
import { useLibraryView, type LibraryView } from '../hooks/useLibraryView';

const UI = 'font-[family-name:var(--face-ui)]';

const FILTERS = ['all', 'reading', 'new', 'finished'] as const;
type Filter = (typeof FILTERS)[number];

/** `new` keeps its URL value; the spec labels it "Unread". */
const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  reading: 'Reading',
  new: 'Unread',
  finished: 'Finished',
};

const SHELF_TITLE: Record<Filter, string> = {
  all: 'All Books',
  reading: 'Reading',
  new: 'Unread',
  finished: 'Finished',
};

const EMPTY_FOR_FILTER: Record<Filter, string> = {
  all: 'Nothing here yet.',
  reading: 'Nothing in progress.',
  new: 'No unstarted books.',
  finished: 'No finished books yet.',
};

/** The spec's 4-column grid, gap 18. */
const GRID = 'grid grid-cols-4 gap-[18px]';

/** The shelf header's dot: fixed `#3E8B3E` in every theme (page 01 → Theme
 *  notes). Not a token — it never changes, and nothing else uses it. */
const SHELF_DOT = '#3E8B3E';

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
  /** Something went wrong. Rendered under the header. */
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
  /** Under the shelf — the filesystem-access banner. */
  footer?: ReactNode;
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
  const [view, setView] = useLibraryView();
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
  // It is the key the bar's chip promises (⌘K belongs to the dictionary, G2).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
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

  // The current book: most recently read, actually in progress, openable here.
  const hero =
    sorted.find((b) => b.lastReadAt && b.available && b.progress > 0 && b.progress < 100) ?? null;

  const counts = useMemo(
    () =>
      FILTERS.reduce(
        (acc, f) => ({ ...acc, [f]: books.filter((b) => matchesFilter(b, f)).length }),
        {} as Record<Filter, number>,
      ),
    [books],
  );

  const q = query.trim().toLowerCase();
  const shelf = useMemo(
    () =>
      sorted
        .filter((b) => b.id !== hero?.id)
        .filter((b) => (q ? `${b.title} ${b.author}`.toLowerCase().includes(q) : true))
        .filter((b) => matchesFilter(b, filter)),
    [sorted, hero?.id, q, filter],
  );

  const isEmpty = !loading && books.length === 0;

  return (
    <div className={cn(UI, 'flex flex-col gap-7 pt-9 pb-12')}>
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Eyebrow tone="accent" dot className="tracking-[0.16em]">
            Reading room
          </Eyebrow>
          <h1 className="text-[42px] leading-none font-bold tracking-[-0.02em] text-(--ink)">Library</h1>
        </div>

        {!isEmpty && (
          <div className="flex items-center gap-2">
            <Button
              variant="white"
              size="sm"
              icon={<Plus size={14} strokeWidth={2.4} />}
              onClick={onImport}
              disabled={importing}
              className="pr-5 pl-4"
            >
              {importing ? 'Importing…' : 'Add Book'}
            </Button>
            <ViewToggle view={view} onChange={setView} />
          </div>
        )}
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {!error && notice && (
        <Banner tone="notice" onDismiss={onDismissNotice}>
          {notice}
        </Banner>
      )}

      {isEmpty ? (
        <LibraryEmpty onImport={onImport} importing={importing} />
      ) : (
        <>
          {/* ── Current book ──────────────────────────────────────────── */}
          {loading ? (
            <HeroSkeleton />
          ) : (
            hero && (
              <HeroBook
                book={hero}
                onResume={() => onOpen(hero)}
                onRename={(title) => onRename(hero, title)}
                onRemove={() => onRemove(hero)}
              />
            )
          )}

          {/* ── Search + filter ───────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-5">
            <SearchBar
              inputRef={searchRef}
              value={query}
              onChange={setQuery}
              placeholder="Search books, authors, or keywords..."
              aria-label="Search your library"
              trailing={<Kbd size="lg">/</Kbd>}
              className="w-[520px] max-w-full"
            />
            <Segmented
              aria-label="Filter books"
              value={filter}
              onChange={setFilter}
              items={FILTERS.map((f) => ({ key: f, label: FILTER_LABEL[f], count: counts[f] }))}
            />
          </div>

          {/* ── Shelf ─────────────────────────────────────────────────── */}
          <section aria-labelledby="library-shelf" className="flex flex-col gap-[18px]">
            <div className="flex items-baseline gap-2.5">
              <span aria-hidden className="size-2 shrink-0 self-center rounded-full" style={{ background: SHELF_DOT }} />
              <h2 id="library-shelf" className="text-[22px] leading-none font-bold tracking-[-0.01em] text-(--ink)">
                {q ? 'Search results' : SHELF_TITLE[filter]}
              </h2>
              {!loading && (
                <span className="text-[13px] font-medium text-(--ink-3) tabular-nums">
                  {shelf.length} {shelf.length === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>

            {loading ? (
              <div className={GRID}>
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] w-full rounded-(--radius-row)" />
                ))}
              </div>
            ) : shelf.length === 0 ? (
              /* A filter with no matches softens to a line; the shelf never
                 collapses. */
              <p className="text-[13.5px] font-medium text-(--ink-3)">
                {q ? 'Nothing matches that search.' : EMPTY_FOR_FILTER[filter]}
              </p>
            ) : view === 'grid' ? (
              <div className={GRID}>
                {shelf.map((book) =>
                  book.available ? (
                    <BookCover
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
              <ul className="flex flex-col gap-2">
                {shelf.map((book) => (
                  <BookRow
                    key={book.id}
                    book={book}
                    onOpen={() => onOpen(book)}
                    onLocate={() => onLocate(book)}
                    onRename={(title) => onRename(book, title)}
                    onMarkFinished={() => onMarkFinished(book)}
                    onRemove={() => onRemove(book)}
                  />
                ))}
              </ul>
            )}
          </section>

          {footer}
        </>
      )}
    </div>
  );
}

// ── View toggle ─────────────────────────────────────────────────────────────

// The white pill with two 34px circles (page 01 → header row). The active
// circle is the app's selected treatment.
function ViewToggle({ view, onChange }: { view: LibraryView; onChange: (v: LibraryView) => void }) {
  const circle = (key: LibraryView, label: string, icon: ReactNode) => {
    const on = view === key;
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={on}
        title={label}
        onClick={() => onChange(key)}
        className={cn(
          PRESS,
          'flex size-[34px] cursor-pointer items-center justify-center rounded-full',
          'transition-[background-color,color,transform] duration-120 ease-[ease]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          on ? ACTIVE : 'text-(--ink-2) hover:bg-[rgb(var(--line-rgb)/0.04)]',
        )}
      >
        {icon}
      </button>
    );
  };

  return (
    <div role="group" aria-label="Shelf layout" className={cn(PANE, 'flex h-11 items-center gap-0.5 rounded-full px-[5px]')}>
      {circle('grid', 'Grid view', <LayoutGrid size={16} strokeWidth={2} />)}
      {circle('list', 'List view', <List size={16} strokeWidth={2} />)}
    </div>
  );
}

// ── Banner ──────────────────────────────────────────────────────────────────

// A `.pane` row with a 3px coloured left edge: `--danger` for an error, the
// accent for a confirmation.
function Banner({
  tone,
  children,
  onDismiss,
}: {
  tone: 'error' | 'notice';
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        PANE,
        'flex items-center gap-3 rounded-(--radius-control) border-l-[3px] px-[18px] py-3.5',
        'text-[13.5px] leading-[1.5] font-medium text-(--ink-2)',
        tone === 'error' ? 'border-l-(--danger)' : 'border-l-(--accent)',
      )}
    >
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            PRESS,
            'shrink-0 cursor-pointer text-[12px] font-bold text-(--ink-3)',
            'transition-[color,transform] duration-120 hover:text-(--ink)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

// ── Loading ─────────────────────────────────────────────────────────────────

// The hero's shell at its real height, so nothing shifts when the data lands.
function HeroSkeleton() {
  return (
    <HeroCard className="flex items-center gap-10">
      <Skeleton className="h-[234px] w-[156px] shrink-0 rounded-(--radius-chip)" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-[26px] w-32" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-1.5 h-2 w-full" />
        <Skeleton className="mt-5 h-[52px] w-56" />
      </div>
    </HeroCard>
  );
}
