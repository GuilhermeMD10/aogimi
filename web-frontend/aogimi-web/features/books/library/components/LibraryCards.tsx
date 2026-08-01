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

import { useEffect, useRef } from 'react';
import { CheckCircle2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CoverTile,
  DASHED,
  Eyebrow,
  HAIRLINE,
  ProgressTrack,
  SkyBar,
} from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { Book } from '@/features/books/types';
import { useBookRowEditing } from '../hooks/useBookRowEditing';

// Reading position is a percentage. The design prints `PAGE 142 / 412` beside
// it, but an EPUB position is a CFI plus a spine index — there is no page
// number to print, and PDF position isn't tracked at all yet.
function statusMeta(progress: number): string {
  if (progress >= 100) return 'Finished';
  if (progress <= 0) return 'Not started';
  return `${progress}%`;
}

const MONO = 'font-[family-name:var(--face-mono)] uppercase';

// ── Overflow menu ───────────────────────────────────────────────────────────

// Rename / mark finished / remove. The handoff's card has no room for these —
// its only interactions are click-to-open and hover-for-info — but they're real
// functionality, so they live behind a `⋯` that appears with the card's hover
// state and sits *outside* the cover's clipping context so the dropdown isn't
// cut off by `overflow-hidden`.
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
          'inline-flex h-6 w-6 items-center justify-center rounded-(--radius-tile)',
          'text-(--muted) transition-opacity duration-120 hover:text-(--ink)',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        )}
      >
        <MoreHorizontal size={14} />
      </button>

      {isOpen && (
        <div
          role="menu"
          // bg-(--bg) rather than bg-(--card): --card is transparent, and a menu
          // has to hide what's behind it.
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
  const { editing, draft, setDraft, menuOpen, setMenuOpen, startEdit, commitEdit, cancelEdit } =
    useBookRowEditing(book, onRename);

  return (
    <Card className="flex gap-[22px]" aria-labelledby="library-continue">
      <CoverTile
        title={book.title}
        seed={book.filename}
        image={book.coverImage}
        raised
        className="h-[152px] w-[104px] shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <Eyebrow>{book.available ? 'Continue reading' : 'Not on this device'}</Eyebrow>
          <BookMenu
            className="ml-auto"
            title={book.title}
            finished={false}
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
            className="mt-1 font-[family-name:var(--face-ui)] text-2xl font-bold"
          />
        ) : (
          <h2
            id="library-continue"
            className="mt-1 truncate font-[family-name:var(--face-ui)] text-2xl font-bold text-(--ink)"
            title={book.title}
          >
            {book.title}
          </h2>
        )}

        {/* The design prints the author and the chapter name here. There is no
            chapter stored on `book_progress`, so the author stands alone. */}
        {book.author && (
          <div className="mt-0.5 truncate font-[family-name:var(--face-ui)] text-[13px] text-(--muted)">
            {book.author}
          </div>
        )}

        <div className="mt-auto pt-3">
          <div className={cn('mb-[7px] flex justify-end text-[10.5px] tracking-[0.14em] text-(--faint)', MONO)}>
            <span>{book.progress}% filled</span>
          </div>
          <SkyBar percent={book.progress} />
        </div>
      </div>

      <div className="flex shrink-0 self-center">
        {book.available ? (
          <Button onClick={onResume}>Resume</Button>
        ) : (
          <Button variant="secondary" onClick={onLocate}>
            Locate file
          </Button>
        )}
      </div>
    </Card>
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
  const { editing, draft, setDraft, menuOpen, setMenuOpen, startEdit, commitEdit, cancelEdit } =
    useBookRowEditing(book, onRename);

  const finished = book.progress >= 100;

  return (
    <div className="group relative">
      <div
        className={cn(
          'relative aspect-[96/140] overflow-hidden rounded-(--radius-cover)',
          'outline-2 outline-offset-2 outline-transparent',
          'transition-[outline-color,transform] duration-[220ms] ease-[ease]',
          'group-hover:-translate-y-[5px] group-hover:outline-(--gold)',
          'group-focus-within:outline-(--gold)',
          'motion-reduce:transition-none motion-reduce:group-hover:translate-y-0',
        )}
      >
        <CoverTile
          title={book.title}
          seed={book.filename}
          image={book.coverImage}
          className="absolute inset-0"
        />

        {/* The click target. A sibling of the panel rather than its parent, so
            the rename field isn't an <input> nested inside a <button>. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${book.title}`}
          className="absolute inset-0 z-[1] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-(--ink)"
        />

        {book.progress > 0 && (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 z-[2] h-1 transition-opacity duration-[220ms] group-hover:opacity-0"
            style={{ background: '#0e1830' }}
          >
            <div className="h-full bg-(--gold)" style={{ width: `${Math.min(100, book.progress)}%` }} />
          </div>
        )}

        {/* Slides up on hover or focus. `pointer-events-none` so a click over it
            still reaches the open button underneath — the handoff wants a plain
            tap to open the book — while the rename field opts back in. */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex h-[55%] flex-col justify-center px-3.5',
            'border-t bg-(--bg)',
            'transition-transform duration-[280ms] ease-[cubic-bezier(.2,.7,.2,1)]',
            'group-hover:translate-y-0 group-focus-within:translate-y-0',
            'motion-reduce:transition-none',
            editing ? 'translate-y-0' : 'translate-y-[101%]',
            HAIRLINE,
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
            <div className="mt-0.5 truncate font-[family-name:var(--face-ui)] text-[11.5px] text-(--muted)">
              {book.author}
            </div>
          )}

          <div className={cn('mt-[11px] mb-[5px] flex justify-between text-[9.5px] tracking-[0.08em] text-(--faint)', MONO)}>
            <span>{statusMeta(book.progress)}</span>
          </div>
          <ProgressTrack percent={book.progress} />
        </div>
      </div>

      <BookMenu
        className="absolute top-1.5 right-1.5 z-10 opacity-0 transition-opacity duration-120 group-hover:opacity-100 group-focus-within:opacity-100"
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
  const { editing, draft, setDraft, menuOpen, setMenuOpen, startEdit, commitEdit, cancelEdit } =
    useBookRowEditing(book, onRename);

  return (
    <div className="flex flex-col gap-[9px]">
      <div className="relative aspect-[96/140]">
        <CoverTile
          title={book.title}
          seed={book.filename}
          image={book.coverImage}
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
            className={cn(
              'cursor-pointer rounded-(--radius-cover) bg-(--btn) px-[11px] py-1.5',
              'font-[family-name:var(--face-ui)] text-[11px] font-bold text-(--btn-ink)',
              'shadow-(--card-shadow) transition-[transform,opacity] duration-120',
              'hover:-translate-y-px active:opacity-[0.92]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
              'motion-reduce:hover:translate-y-0',
            )}
          >
            Re-add
          </button>
        </div>
      </div>

      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
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
          <div className={cn('mt-0.5 text-[10px] tracking-[0.08em] text-(--faint)', MONO)}>
            {book.progress > 0 ? `${book.progress}% · kept` : 'new'}
          </div>
        </div>

        <BookMenu
          title={book.title}
          finished={book.progress >= 100}
          isOpen={menuOpen}
          setOpen={setMenuOpen}
          onRename={startEdit}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}
