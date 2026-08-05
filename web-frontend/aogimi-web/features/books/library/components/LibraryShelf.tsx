'use client';

// `/` — the library shelf, and the app's landing page. Composition, geometry and the client-side
// filter; it fetches nothing. `BooksView` owns the data and every handler, this
// arranges the tiles in `LibraryCards` and the empty state in `LibraryEmpty`.

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Plus, Search } from 'lucide-react';
import { GLASS_ACTIVE, GLASS_BUTTON, GLASS_PRESS, GLASS_SURFACE, HAIRLINE, Skeleton } from '@/shared/components';
import { TopBar } from '@/features/app-shell/TopBar';
import { cn } from '@/lib/util/cn';
import type { Book } from '@/features/books/types';
import { BookCard, ContinueReadingCard, ReimportCard } from './LibraryCards';
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

// Three columns, per the handoff. Fixed rather than responsive now that the
// hero eats a fixed 470px: the shelf's own width no longer tracks the viewport
// closely enough for a column count to be worth deriving from it.
const GRID = 'grid grid-cols-3 content-start gap-[22px]';

/** The hero's column. `470px` is the handoff's; it holds a 196px cover. */
const HERO_COL = '470px';

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
  /** Below the grid, inside the shelf scroller — the filesystem-access banner. */
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

  // No book is partway through (everything new, or everything finished), so
  // there is no hero — and a 470px column of nothing beside the shelf reads as
  // a bug. The shelf takes the full width instead.
  const twoColumn = loading || hero !== null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden font-[family-name:var(--face-ui)] font-medium">
      <div className="mx-auto flex min-h-0 w-full max-w-[1300px] flex-1 flex-col px-11 pt-[34px] pb-[140px]">
        <TopBar />

        {/* Row 1 — the page title, on its own line. */}
        <div className="mb-[18px] flex shrink-0 items-center justify-between gap-6">
          <div className="flex items-center gap-[11px]">
            <BookOpen size={24} strokeWidth={1.7} className="shrink-0 text-(--ink)" />
            <h1 className="text-[23px] font-bold tracking-[-0.01em] text-(--ink)">Library</h1>
          </div>

          {!isEmpty && (
            <button
              type="button"
              onClick={onImport}
              disabled={importing}
              className={cn(
                GLASS_BUTTON,
                GLASS_PRESS,
                'flex shrink-0 items-center gap-2 rounded-(--radius-button) p-2',
                'text-[13.5px] font-bold text-(--ink)',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                importing && 'opacity-60',
              )}
            >
              <Plus size={16} strokeWidth={1.9} />
              {importing ? 'Importing…' : ''}
            </button>
          )}
        </div>

        {/* Row 2 — filters at one end, search at the other. */}
        {!isEmpty && (
          <div className="mb-[22px] flex shrink-0 items-center justify-end gap-6">
            <div className="flex flex-wrap gap-2 justify-between">
              {FILTERS.map((f) => (
                <FilterChip
                  key={f}
                  label={FILTER_LABEL[f]}
                  count={counts[f]}
                  active={filter === f}
                  onClick={() => setFilter(f)}
                />
              ))}
              <SearchField inputRef={searchRef} value={query} onChange={setQuery} />
            </div>
          </div>
        )}

        {error && <Banner tone="error">{error}</Banner>}
        {!error && notice && (
          <Banner tone="notice" onDismiss={onDismissNotice}>
            {notice}
          </Banner>
        )}

        {isEmpty ? (
          <LibraryEmpty onImport={onImport} importing={importing} />
        ) : (
          <div
            className="grid min-h-0 flex-1 gap-[30px]"
            style={{ gridTemplateColumns: twoColumn ? `${HERO_COL} minmax(0,1fr)` : 'minmax(0,1fr)' }}
          >
            {loading ? (
              <HeroSkeleton />
            ) : (
              hero && (
                <ContinueReadingCard
                  book={hero}
                  onResume={() => onOpen(hero)}
                  onLocate={() => onLocate(hero)}
                  onRename={(title) => onRename(hero, title)}
                  onRemove={() => onRemove(hero)}
                />
              )
            )}

            {/* The one scroller on the screen. `pr` leaves the thumb its lane so
                it doesn't sit on top of the last column of covers. */}
            <div className="inner-scroll min-h-0 overflow-y-auto pr-2.5 pb-8 pl-1">
              {loading ? (
                <div className={GRID}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="aspect-[96/140] w-full rounded-(--radius-cover)" />
                  ))}
                </div>
              ) : grid.length > 0 ? (
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
                /* A filter with no matches softens to a line; the shelf area
                   never collapses. */
                <p className="text-[13.5px] text-(--muted)">
                  {q ? 'Nothing matches that search.' : EMPTY_FOR_FILTER[filter]}
                </p>
              )}

              {footer && <div className="mt-8">{footer}</div>}
            </div>
          </div>
        )}
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
        'mb-[22px] flex shrink-0 items-center gap-3 rounded-(--radius-button) border border-l-[3px] px-[18px] py-3.5',
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
            GLASS_PRESS,
            'shrink-0 cursor-pointer font-[family-name:var(--face-mono)] text-[11px] tracking-[0.14em] uppercase',
            // transform rides along: a bare `transition-colors` would win over
            // GLASS_PRESS's own list and the nudge would snap instead of ease.
            'text-(--faint) transition-[color,transform] duration-120 hover:text-(--ink)',
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
        'inline-flex min-w-55 shrink-0 items-center gap-2 rounded-(--radius-input) border px-2.5 py-2',
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
    </div>
  );
}

// ── Filter chip ─────────────────────────────────────────────────────────────

// Not the shared `Chip`: that one is a link or a static label, and these are
// single-select controls with a pressed state and their own mono type scale.
//
// Plain white glass when unselected (it used to carry GLASS_SCRIM, the on-cover
// treatment, which nothing on this row sits on), the app's active glass when
// selected. Selection used to be
// shadcn's `bg-primary` (= `--btn`, so a black chip on paper and a white one at
// night) with a `--gold` edge on hover, which asked the eye to tell selected
// from hovered by hue. `GLASS_ACTIVE` brings the fill AND the ink, so there is
// no `text-*` on the selected branch — a utility would beat the recipe.
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
        GLASS_BUTTON,
        GLASS_PRESS,
        'inline-flex items-center gap-1.5 rounded-(--radius-chip) py-2 px-3',
        'font-(family-name:--face-mono) text-[12px] uppercase',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        active ? GLASS_ACTIVE : 'text-(--soft)',
      )}
    >
      {label}
      <span className="text-[12px] opacity-70">{count}</span>
    </button>
  );
}

// ── Loading ─────────────────────────────────────────────────────────────────

// The hero's glass shell, at its real height, so the two-column geometry is
// already correct when the shelf arrives. The cover skeletons are rendered
// inline in the shelf column above.
function HeroSkeleton() {
  return (
    <div className={cn(GLASS_SURFACE, 'flex h-fit gap-[22px] self-start rounded-(--radius-panel) p-[26px]')}>
      <Skeleton className="aspect-[96/140] w-[176px] shrink-0 rounded-(--radius-cover)" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="mt-auto h-[26px] w-full" />
      </div>
    </div>
  );
}
