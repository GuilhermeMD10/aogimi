'use client';

// The library shelf's three tiles, in one file because they're variations on a
// single idea — a book, its cover, and how much of it is read:
//
//   <ContinueReadingCard>  the hero for the book you're partway through
//   <BookCard>             a book whose file is on this device
//   <ReimportCard>         a book the backend knows about whose file isn't here
//
// `LibraryShelf` composes them. Which of the last two a book gets is decided by
// `book.available` alone — there is no separate "re-import screen" any more, so
// a half-restored library is just the library.
//
// ── Glass ───────────────────────────────────────────────────────────────────
// The hero is a `GLASS_SURFACE` panel; every cover carries the `sheen` edge
// treatment; the ⋯ trigger and the hero's CTA are `GLASS_BUTTON`s; the book
// card's slide-up panel is a `GLASS_SHEET`. The recipe and all of its numbers
// live in `styles/glass.css` — nothing here hardcodes a glass value.

import { useEffect, useRef } from 'react';
import { CheckCircle2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  CoverTile,
  DASHED,
  Eyebrow,
  GLASS_BUTTON,
  GLASS_SHEET,
  GLASS_SURFACE,
  HAIRLINE,
  ProgressTrack,
  SkyBar,
} from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { Book } from '@/features/books/types';
import { useBookRowEditing } from '../hooks/useBookRowEditing';

// The handoff's status row is two slots — "PAGE 198 / 280" beside "71%". There
// is no page number to print on either side of the library: an EPUB position is
// a CFI plus a spine index, and while a PDF's page *is* tracked it isn't carried
// on the merged `Book` tile. So the left slot states what the book is rather
// than where you are in it, and the right slot keeps the percentage.
function statusLabel(progress: number): string {
  if (progress >= 100) return 'Finished';
  if (progress <= 0) return 'Not started';
  return 'Reading';
}

function statusValue(progress: number): string {
  if (progress <= 0) return 'New';
  return `${Math.min(100, Math.round(progress))}%`;
}

const MONO = 'font-[family-name:var(--face-mono)] uppercase';

/**
 * The hero cover. The handoff says 196px inside the 470px column; this is 176.
 *
 * Two reasons, both from the page no longer scrolling. At 196 the cover is
 * 286px tall and the whole column measures ~777px — nine pixels past a 768px
 * laptop, which clips the "Resume reading" button with nowhere to scroll to.
 * And 196 leaves the meta column exactly 200px, which is fine for the mock's
 * "I Am a Cat" and cramped for a real OPF title at 25px. 176 buys back 29px of
 * height and 20px of text column. Change this one constant to go back.
 */
const HERO_COVER = 'w-[176px]';

// ── Overflow menu ───────────────────────────────────────────────────────────

// Rename / mark finished / remove. The handoff's card has no room for these —
// its only interactions are click-to-open and hover-for-info — so they live
// behind a ⋯ that floats in the top-right corner of the hero and of every
// cover, as a glass circle. It sits *outside* the cover's clipping context so
// the dropdown isn't cut off by `overflow-hidden`.
function BookMenu({
  title,
  finished,
  isOpen,
  setOpen,
  onRename,
  onMarkFinished,
  onRemove,
  className,
}: {
  title: string;
  finished: boolean;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  onRename: () => void;
  /** Omit on a tile where finishing makes no sense (the continue hero). */
  onMarkFinished?: () => void;
  onRemove: () => void;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, setOpen]);

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={`More actions for ${title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
        className={cn(
          GLASS_BUTTON,
          'inline-flex size-7 items-center justify-center rounded-full',
          'text-(--soft) hover:text-(--ink)',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        )}
      >
        <MoreHorizontal size={14} />
      </button>

      {isOpen && (
        <div
          role="menu"
          // bg-(--bg) rather than glass: a menu has to hide what's behind it,
          // and a frosted one over cover art is unreadable.
          className={cn(
            'absolute top-[calc(100%+6px)] right-0 z-20 min-w-[184px] p-1',
            'rounded-(--radius-button) border bg-(--bg) shadow-(--card-shadow-float)',
            HAIRLINE,
          )}
        >
          <MenuItem
            icon={<Pencil size={13} />}
            onClick={() => {
              setOpen(false);
              onRename();
            }}
          >
            Edit title
          </MenuItem>
          {!finished && onMarkFinished && (
            <MenuItem
              icon={<CheckCircle2 size={13} />}
              onClick={() => {
                setOpen(false);
                onMarkFinished();
              }}
            >
              Mark as finished
            </MenuItem>
          )}
          <MenuItem
            icon={<Trash2 size={13} />}
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            Remove from library
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-(--radius-tile) px-2.5 py-[7px]',
        'font-[family-name:var(--face-ui)] text-[12.5px] text-(--soft)',
        'transition-colors duration-120 hover:text-(--ink)',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// Shared inline-rename field. Sizing is the caller's, since the hero renames at
// display size and a card renames at 16px.
function TitleInput({
  draft,
  setDraft,
  commit,
  cancel,
  className,
}: {
  draft: string;
  setDraft: (v: string) => void;
  commit: () => void;
  cancel: () => void;
  className?: string;
}) {
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      }}
      onBlur={commit}
      className={cn(
        'w-full rounded-(--radius-tile) border bg-(--bg) px-2 py-0.5 text-(--ink) outline-none',
        HAIRLINE,
        className,
      )}
    />
  );
}

// ── Continue reading (hero) ─────────────────────────────────────────────────

export function ContinueReadingCard({
  book,
  onResume,
  onLocate,
  onRename,
  onRemove,
}: {
  book: Book;
  onResume: () => void;
  onLocate: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  const { editing, draft, setDraft, menuOpen, setMenuOpen, startEdit, commitEdit, cancelEdit } = useBookRowEditing(
    book,
    onRename,
  );

  return (
    // `h-fit self-start` — the hero sizes to its content and pins to the top of
    // the grid row, so its top edge lines up with the first row of covers
    // instead of stretching down beside the whole shelf.
    <section
      aria-labelledby="library-continue"
      className={cn(GLASS_SURFACE, 'flex h-fit flex-col gap-[22px] self-start rounded-(--radius-panel) p-[26px]')}
    >
      <BookMenu
        className="absolute top-3.5 right-3.5 z-10"
        title={book.title}
        finished={false}
        isOpen={menuOpen}
        setOpen={setMenuOpen}
        onRename={startEdit}
        onRemove={onRemove}
      />

      <div className="flex gap-[22px]">
        <CoverTile
          title={book.title}
          seed={book.filename}
          image={book.coverImage}
          raised
          sheen
          className={cn(HERO_COVER, 'aspect-[96/140] shrink-0')}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Clears the floating ⋯. */}
          <Eyebrow className="pr-8">{book.available ? 'Continue reading' : 'Not on this device'}</Eyebrow>

          {editing ? (
            <TitleInput
              draft={draft}
              setDraft={setDraft}
              commit={commitEdit}
              cancel={cancelEdit}
              className="font-(family-name:--face-ui) text-xl font-bold"
            />
          ) : (
            <h2
              id="library-continue"
              className="line-clamp-3 font-(family-name:--face-ui) text-[25px] leading-[1.15] font-bold text-(--ink)"
              title={book.title}
            >
              {book.title}
            </h2>
          )}

          {/* The design prints the author and the chapter name here. There is no
              chapter stored on `book_progress`, so the author stands alone. */}
          {book.author && (
            <div className="line-clamp-2 font-(family-name:--face-ui) text-[13px] text-(--soft)">{book.author}</div>
          )}

          <div className="pt-4 flex justify-between gap-4">
            <div className="flex flex-col w-full">
              <div className={cn('mb-[7px] flex justify-between text-[10.5px] tracking-[0.14em] text-(--faint)', MONO)}>
                <span>{statusLabel(book.progress)}</span>
                <span>{statusValue(book.progress)}</span>
              </div>
              <SkyBar percent={book.progress} />
            </div>
            <button
              type="button"
              onClick={book.available ? onResume : onLocate}
              className={cn(
                GLASS_BUTTON,
                'p-2 mt-auto rounded-full text-[14px] font-bold text-(--ink)',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
              )}
            >
              {book.available ? 'Red' : 'Imt'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Book card ───────────────────────────────────────────────────────────────

export function BookCard({
  book,
  onOpen,
  onRename,
  onMarkFinished,
  onRemove,
}: {
  book: Book;
  onOpen: () => void;
  onRename: (title: string) => void;
  onMarkFinished: () => void;
  onRemove: () => void;
}) {
  const { editing, draft, setDraft, menuOpen, setMenuOpen, startEdit, commitEdit, cancelEdit } = useBookRowEditing(
    book,
    onRename,
  );

  const finished = book.progress >= 100;

  return (
    // The −5px hover lift is on the group rather than on the cover, so the
    // floating ⋯ rides up with the card instead of staying behind.
    <div
      className={cn(
        'group relative transition-transform duration-[220ms] ease-[ease] hover:-translate-y-[5px]',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <div
        className={cn(
          'relative aspect-[96/140] overflow-hidden rounded-(--radius-cover)',
          'outline-2 outline-offset-2 outline-transparent transition-[outline-color] duration-[220ms] ease-[ease]',
          'group-hover:outline-(--gold) group-focus-within:outline-(--gold)',
        )}
      >
        <CoverTile title={book.title} seed={book.filename} image={book.coverImage} sheen className="absolute inset-0" />

        {/* The click target. A sibling of the panel rather than its parent, so
            the rename field isn't an <input> nested inside a <button>. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${book.title}`}
          className="absolute inset-0 z-[1] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-(--ink)"
        />

        {/* The progress sliver, hidden while the panel is up. */}
        {book.progress > 0 && (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 z-[2] h-1 bg-black/50 transition-opacity duration-[220ms] group-hover:opacity-0"
          >
            <div className="h-full bg-(--gold)" style={{ width: `${Math.min(100, book.progress)}%` }} />
          </div>
        )}

        {/* Slides up on hover or focus. `pointer-events-none` so a click over it
            still reaches the open button underneath — the handoff wants a plain
            tap to open the book — while the rename field opts back in. */}
        <div
          className={cn(
            GLASS_SHEET,
            'pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex h-[55%] flex-col justify-center px-3.5',
            'transition-transform duration-[280ms] ease-[cubic-bezier(.2,.7,.2,1)]',
            'group-hover:translate-y-0 group-focus-within:translate-y-0',
            'motion-reduce:transition-none',
            editing ? 'translate-y-0' : 'translate-y-[101%]',
          )}
        >
          {editing ? (
            <TitleInput
              draft={draft}
              setDraft={setDraft}
              commit={commitEdit}
              cancel={cancelEdit}
              className="pointer-events-auto font-[family-name:var(--face-ui)] text-[15px] font-bold"
            />
          ) : (
            <div
              className="truncate font-[family-name:var(--face-ui)] text-base leading-[1.2] font-bold text-(--ink)"
              title={book.title}
            >
              {book.title}
            </div>
          )}

          {book.author && (
            <div className="mt-0.5 truncate font-[family-name:var(--face-ui)] text-[11.5px] text-(--soft)">
              {book.author}
            </div>
          )}

          <div
            className={cn('mt-[11px] mb-[5px] flex justify-between text-[9.5px] tracking-[0.08em] text-(--soft)', MONO)}
          >
            <span>{statusLabel(book.progress)}</span>
            <span>{statusValue(book.progress)}</span>
          </div>
          {/* Gold rather than the primitive's `--fill`, matching the cover's
              sliver — on this screen progress is always the book's gold. */}
          <ProgressTrack percent={book.progress} className="[&>div]:bg-(--gold)" />
        </div>
      </div>

      <BookMenu
        className={cn(
          'absolute top-2 right-2 z-10 transition-opacity duration-120',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        )}
        title={book.title}
        finished={finished}
        isOpen={menuOpen}
        setOpen={setMenuOpen}
        onRename={startEdit}
        onMarkFinished={onMarkFinished}
        onRemove={onRemove}
      />
    </div>
  );
}

// ── Re-import card ──────────────────────────────────────────────────────────

// A book whose progress survived but whose file didn't. Ghosted cover behind a
// dashed outline, with the one action that resolves it.
//
// There is no "restored" variant with a green tick: the moment a file attaches,
// `book.available` flips and the tile becomes a real <BookCard>, which says the
// same thing more directly than a badge would.
export function ReimportCard({
  book,
  onReAdd,
  onRename,
  onRemove,
}: {
  book: Book;
  onReAdd: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  const { editing, draft, setDraft, menuOpen, setMenuOpen, startEdit, commitEdit, cancelEdit } = useBookRowEditing(
    book,
    onRename,
  );

  return (
    <div className="group relative flex flex-col gap-[9px]">
      <div className="relative aspect-[96/140]">
        <CoverTile
          title={book.title}
          seed={book.filename}
          image={book.coverImage}
          sheen
          className="absolute inset-0 opacity-40 saturate-[.4] brightness-[.92]"
        />
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-(--radius-cover) border-[1.5px] border-dashed',
            DASHED,
          )}
        >
          <button
            type="button"
            onClick={onReAdd}
            className={cn(GLASS_BUTTON, 'rounded-(--radius-button) px-3 py-2 round')}
          >
            <Plus size={16} strokeWidth={1.9} />
          </button>
        </div>

        {/* Same corner as a live cover's, so the shelf reads as one grid. */}
        <BookMenu
          className={cn(
            'absolute top-2 right-2 z-10 transition-opacity duration-120',
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
          title={book.title}
          finished={book.progress >= 100}
          isOpen={menuOpen}
          setOpen={setMenuOpen}
          onRename={startEdit}
          onRemove={onRemove}
        />
      </div>

      {editing ? (
        <TitleInput
          draft={draft}
          setDraft={setDraft}
          commit={commitEdit}
          cancel={cancelEdit}
          className="font-[family-name:var(--face-ui)] text-[12.5px] font-bold"
        />
      ) : (
        <div
          className="truncate font-[family-name:var(--face-ui)] text-[12.5px] font-bold text-(--muted)"
          title={book.title}
        >
          {book.title}
        </div>
      )}
      <div className={cn('-mt-1 text-[10px] tracking-[0.08em] text-(--faint)', MONO)}>
        {book.progress > 0 ? `${book.progress}% · kept` : 'new'}
      </div>
    </div>
  );
}
