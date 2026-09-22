'use client';

// The library's tiles (page 01), in one file because they're variations on a
// single idea — a book, its cover, and how much of it is read:
//
//   <HeroBook>      the hero card for the book you're partway through
//   <BookCover>     a grid tile — the cover, and nothing on it until hover
//   <BookRow>       the list view's row (G3, the result-row pattern)
//   <ReimportCard>  a book the backend knows about whose file isn't here (D9)
//
// `LibraryShelf` composes them. Which tile a book gets is decided by
// `book.available` alone — a half-restored library is just the library.
//
// Actions (rename, mark finished, remove) live behind a `more` circle on every
// tile, never on the cover itself: the spec's cover is an image, and its only
// gesture is click-to-open with a hover lift.

import { useEffect, useRef, type ReactNode } from 'react';
import { CheckCircle2, Pencil, Trash2, Plus } from 'lucide-react';
import { Button, CoverTile, HeroCard, PANE, PRESS, ProgressBar } from '@/shared/components';
import { MoreIcon, PlayRingIcon } from '@/shared/icons';
import { coverPalette } from '../../lib/coverPalette';
import { cn } from '@/lib/util/cn';
import type { Book } from '@/features/books/types';
import { useBookRowEditing } from '../hooks/useBookRowEditing';

const UI = 'font-[family-name:var(--face-ui)]';

/** The cover's edge and lift, shared by the grid tile and the hero. */
const COVER_SHADOW = 'shadow-[0_10px_28px_rgb(var(--line-rgb)/0.1)]';

function statusLabel(progress: number): string {
  if (progress >= 100) return 'Finished';
  if (progress <= 0) return 'Unread';
  return 'Reading';
}

// ── Overflow menu ───────────────────────────────────────────────────────────

function BookMenu({
  title,
  finished,
  isOpen,
  setOpen,
  onRename,
  onMarkFinished,
  onRemove,
  size = 'sm',
  className,
}: {
  title: string;
  finished: boolean;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  onRename: () => void;
  /** Omit on a tile where finishing makes no sense (the hero). */
  onMarkFinished?: () => void;
  onRemove: () => void;
  /** `sm` is the 32px circle that floats on a cover; `md` the 44px icon
   *  button in the hero's action row. */
  size?: 'sm' | 'md';
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
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, setOpen]);

  const label = `More actions for ${title}`;

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      {size === 'md' ? (
        <Button variant="icon" glyph="more" size="sm" onClick={() => setOpen(!isOpen)} aria-label={label} aria-pressed={isOpen} />
      ) : (
        <button
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setOpen(!isOpen)}
          className={cn(
            PANE,
            PRESS,
            'inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--ink-2) hover:text-(--ink)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          <MoreIcon size={14} />
        </button>
      )}

      {isOpen && (
        <div
          role="menu"
          className={cn(
            'absolute top-[calc(100%+6px)] right-0 z-20 min-w-[196px] p-1.5',
            'rounded-(--radius-control) border border-(--hairline) bg-(--pane-strong) shadow-(--shadow-card)',
          )}
        >
          <MenuItem icon={<Pencil size={13} />} onClick={() => { setOpen(false); onRename(); }}>
            Edit title
          </MenuItem>
          {!finished && onMarkFinished && (
            <MenuItem icon={<CheckCircle2 size={13} />} onClick={() => { setOpen(false); onMarkFinished(); }}>
              Mark as finished
            </MenuItem>
          )}
          <MenuItem icon={<Trash2 size={13} />} onClick={() => { setOpen(false); onRemove(); }}>
            Remove from library
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={cn(
        PRESS,
        UI,
        'flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-chip) px-2.5 py-2 text-left',
        'text-[13px] font-medium text-(--ink-2)',
        'transition-[color,background-color,transform] duration-120 hover:bg-[rgb(var(--line-rgb)/0.04)] hover:text-(--ink)',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// Shared inline-rename field. Sizing is the caller's.
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
      aria-label="Book title"
      className={cn(
        UI,
        'w-full rounded-(--radius-control) border border-(--hairline) bg-(--pane-strong) px-3 py-1.5 text-(--ink) outline-none focus:border-(--ink)',
        className,
      )}
    />
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

export function HeroBook({
  book,
  onResume,
  onRename,
  onRemove,
}: {
  book: Book;
  onResume: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  const { editing, draft, setDraft, menuOpen, setMenuOpen, startEdit, commitEdit, cancelEdit } = useBookRowEditing(
    book,
    onRename,
  );

  return (
    <HeroCard aria-labelledby="library-current" className="flex items-center gap-10">
      <CoverTile
        title={book.title}
        colors={coverPalette(book.filename)}
        image={book.coverImage}
        className="h-[234px] w-[156px] shrink-0 rounded-(--radius-chip) shadow-[0_18px_36px_rgb(var(--line-rgb)/0.2)]"
      />

      <div className={cn(UI, 'flex min-w-0 flex-1 flex-col gap-3')}>
        <span className="inline-flex h-[26px] w-fit items-center gap-2 rounded-full bg-[rgb(var(--accent-soft-rgb)/0.38)] px-3 text-[12px] leading-none font-bold text-(--accent)">
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          Current Reading
        </span>

        {editing ? (
          <TitleInput draft={draft} setDraft={setDraft} commit={commitEdit} cancel={cancelEdit} className="text-[22px] font-bold" />
        ) : (
          <h2
            id="library-current"
            className="line-clamp-2 font-[family-name:var(--face-jp)] text-[32px] leading-[1.1] font-bold tracking-[-0.02em] text-(--ink)"
            title={book.title}
          >
            {book.title}
          </h2>
        )}

        {book.author && <div className="truncate text-[15px] font-medium text-(--ink-2)">{book.author}</div>}

        <ProgressBar percent={book.progress} height={8} label className="mt-1.5" />

        <div className="mt-5 flex items-center justify-between gap-4">
          <Button size="lg" icon={<PlayRingIcon />} onClick={onResume} className="pr-[30px] pl-6">
            Resume Reading
          </Button>
          <BookMenu
            size="md"
            title={book.title}
            finished={false}
            isOpen={menuOpen}
            setOpen={setMenuOpen}
            onRename={startEdit}
            onRemove={onRemove}
          />
        </div>
      </div>
    </HeroCard>
  );
}

// ── Grid tile ───────────────────────────────────────────────────────────────

export function BookCover({
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

  return (
    <div className="group relative">
      {/* The lift is on the cover box so the floating `more` rides up with it. */}
      <div
        className={cn(
          'relative aspect-[3/4] overflow-hidden rounded-(--radius-row) border border-(--hairline)',
          COVER_SHADOW,
          'transition-[transform,box-shadow] duration-120 ease-[ease]',
          'group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_32px_rgb(var(--line-rgb)/0.16)]',
          'motion-reduce:transition-none motion-reduce:group-hover:translate-y-0',
        )}
      >
        <CoverTile title={book.title} colors={coverPalette(book.filename)} image={book.coverImage} className="absolute inset-0 rounded-none" />

        {/* The click target — a sibling of the menu, so the rename field is
            never an <input> inside a <button>. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${book.title}`}
          title={book.title}
          className="absolute inset-0 z-[1] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-(--ink)"
        />

        {editing && (
          <div className={cn(PANE, 'absolute inset-x-2 bottom-2 z-[3] rounded-(--radius-control) p-1.5')}>
            <TitleInput draft={draft} setDraft={setDraft} commit={commitEdit} cancel={cancelEdit} className="text-[13px] font-bold" />
          </div>
        )}
      </div>

      <BookMenu
        className={cn(
          'absolute top-2 right-2 z-10 transition-opacity duration-120',
          menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        )}
        title={book.title}
        finished={book.progress >= 100}
        isOpen={menuOpen}
        setOpen={setMenuOpen}
        onRename={startEdit}
        onMarkFinished={onMarkFinished}
        onRemove={onRemove}
      />
    </div>
  );
}

// ── List row ────────────────────────────────────────────────────────────────

/** A 64px `.pane` row: thumbnail, title + author, progress, state, `more`.
 *  Unavailable books get a "Locate file" pill where the progress would be. */
export function BookRow({
  book,
  onOpen,
  onLocate,
  onRename,
  onMarkFinished,
  onRemove,
}: {
  book: Book;
  onOpen: () => void;
  onLocate: () => void;
  onRename: (title: string) => void;
  onMarkFinished: () => void;
  onRemove: () => void;
}) {
  const { editing, draft, setDraft, menuOpen, setMenuOpen, startEdit, commitEdit, cancelEdit } = useBookRowEditing(
    book,
    onRename,
  );

  return (
    <li className={cn(PANE, 'relative flex h-16 items-center gap-4 rounded-(--radius-row) pr-3 pl-3')}>
      {book.available && (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${book.title}`}
          className="absolute inset-0 z-[1] cursor-pointer rounded-(--radius-row) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        />
      )}

      <CoverTile
        title={book.title}
        colors={coverPalette(book.filename)}
        image={book.coverImage}
        className={cn('h-12 w-9 shrink-0 rounded-(--radius-chip) py-1 text-[8px]', !book.available && 'opacity-50 saturate-50')}
      />

      <div className={cn(UI, 'relative z-[2] min-w-0 flex-1 pointer-events-none')}>
        {editing ? (
          <div className="pointer-events-auto">
            <TitleInput draft={draft} setDraft={setDraft} commit={commitEdit} cancel={cancelEdit} className="text-[14px] font-bold" />
          </div>
        ) : (
          <div className="truncate text-[15px] font-bold text-(--ink)" title={book.title}>
            {book.title}
          </div>
        )}
        {book.author && !editing && <div className="truncate text-[13px] font-medium text-(--ink-2)">{book.author}</div>}
      </div>

      {book.available ? (
        <ProgressBar percent={book.progress} height={4} label className="w-44 shrink-0" />
      ) : (
        <Button variant="white" size="sm" onClick={onLocate} className="relative z-[2] h-9 px-4 text-[13px]">
          Locate file
        </Button>
      )}

      <span
        className={cn(
          UI,
          'inline-flex h-[22px] shrink-0 items-center rounded-(--radius-chip) bg-[rgb(var(--line-rgb)/0.05)] px-2 text-[10px] leading-none font-medium tracking-[0.06em] uppercase text-(--ink-2)',
        )}
      >
        {book.available ? statusLabel(book.progress) : 'Not on this device'}
      </span>

      <BookMenu
        className="relative z-[2] shrink-0"
        title={book.title}
        finished={book.progress >= 100}
        isOpen={menuOpen}
        setOpen={setMenuOpen}
        onRename={startEdit}
        onMarkFinished={book.available ? onMarkFinished : undefined}
        onRemove={onRemove}
      />
    </li>
  );
}

// ── Re-import card ──────────────────────────────────────────────────────────

// A book whose progress survived but whose file didn't (no handoff — D9, the
// layout kept). Ghosted cover behind a dashed outline, and the one action that
// resolves it. The moment a file attaches, `book.available` flips and the tile
// becomes a real <BookCover>.
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
    <div className="group relative flex flex-col gap-2">
      <div className="relative aspect-[3/4]">
        <CoverTile
          title={book.title}
          colors={coverPalette(book.filename)}
          image={book.coverImage}
          className="absolute inset-0 opacity-40 saturate-[.4] brightness-[.92]"
        />
        <div className="absolute inset-0 flex items-center justify-center rounded-(--radius-row) border-[1.5px] border-dashed border-[rgb(var(--line-rgb)/0.14)]">
          <Button variant="icon" size="sm" onClick={onReAdd} aria-label={`Locate the file for ${book.title}`} title="Locate file">
            <Plus size={18} strokeWidth={2} />
          </Button>
        </div>

        <BookMenu
          className={cn(
            'absolute top-2 right-2 z-10 transition-opacity duration-120',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
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
        <TitleInput draft={draft} setDraft={setDraft} commit={commitEdit} cancel={cancelEdit} className="text-[12.5px] font-bold" />
      ) : (
        <div className={cn(UI, 'truncate text-[12.5px] font-bold text-(--ink-3)')} title={book.title}>
          {book.title}
        </div>
      )}
      <div className={cn(UI, '-mt-1 text-[10px] font-medium tracking-[0.06em] uppercase text-(--ink-3)')}>
        {book.progress > 0 ? `${Math.round(book.progress)}% · not on this device` : 'not on this device'}
      </div>
    </div>
  );
}
