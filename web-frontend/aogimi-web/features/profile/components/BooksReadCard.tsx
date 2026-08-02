'use client';

import Link from 'next/link';
import { MonoAction, PaperCard, PAPER_GHOST, Skeleton, coverPalette } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { useProfileBooks, type ProfileBook } from '../hooks/useProfileBooks';

/**
 * The reading record — the reason the page exists. Finished books lead, each
 * row links into the reader. The handoff's per-row word counts and finish
 * dates are dropped (cards don't record a source book; no finished-at column),
 * so the right cell is just the readout and the summary strip is three facts.
 */
export function BooksReadCard() {
  const { books, summary, loading, error, refresh } = useProfileBooks();

  const facts: string[] = [];
  if (summary.total > 0) facts.push(`${summary.total} ${summary.total === 1 ? 'BOOK' : 'BOOKS'}`);
  if (summary.finished > 0) facts.push(`${summary.finished} FINISHED`);
  if (summary.since) facts.push(`SINCE ${summary.since}`);

  return (
    <PaperCard aria-labelledby="profile-books">
      <div className="flex items-baseline justify-between px-6 pt-5 pb-1">
        <h2
          id="profile-books"
          className="font-[family-name:var(--face-ui)] text-[22px] font-bold text-(--ink)"
        >
          Books you&rsquo;ve read
        </h2>
        <MonoAction href="/reader">LIBRARY →</MonoAction>
      </div>

      {facts.length > 0 && (
        <div className="flex flex-wrap gap-x-[22px] gap-y-1 px-6 pb-4 font-[family-name:var(--face-mono)] text-[10px] tracking-[0.14em] text-(--faint) tabular-nums">
          {facts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </div>
      )}

      {loading ? (
        Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="border-t border-(--paper-bd) px-6 py-3.5">
            <Skeleton className="h-[54px] w-full" />
          </div>
        ))
      ) : error ? (
        <div className="border-t border-(--paper-bd) px-6 py-5">
          <p className="font-[family-name:var(--face-ui)] text-[13.5px] text-(--muted)">
            Couldn&rsquo;t load your books.{' '}
            <button
              type="button"
              onClick={() => void refresh()}
              className="font-[family-name:var(--face-mono)] text-[11.5px] tracking-[0.1em] text-(--muted) underline underline-offset-2 hover:text-(--ink)"
            >
              RETRY
            </button>
          </p>
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-start gap-3.5 border-t border-(--paper-bd) px-6 py-5">
          <p className="font-[family-name:var(--face-ui)] text-[13.5px] text-(--muted)">
            Nothing read yet — open a book in the reader.
          </p>
          <Link href="/reader" className={PAPER_GHOST}>
            Open reader
          </Link>
        </div>
      ) : (
        <ul>
          {books.map((book) => (
            <BookRow key={book.id} book={book} />
          ))}
        </ul>
      )}
    </PaperCard>
  );
}

function BookRow({ book }: { book: ProfileBook }) {
  const { surface, ink } = coverPalette(book.filename);
  const pct = Math.max(0, Math.min(100, book.progress));

  // Fill mirrors the reading state: gold when finished, soft while reading,
  // faint when barely started (<25%).
  const fill = book.finished ? 'var(--gold)' : pct >= 25 ? 'var(--soft)' : 'var(--faint)';

  return (
    <li className="border-t border-(--paper-bd)">
      <Link
        href={`/reader/${encodeURIComponent(book.filename)}`}
        aria-label={`Open ${book.title}`}
        className="flex items-center gap-4 px-6 py-3.5 transition-colors duration-120 ease-[ease] hover:bg-(--paper-tile) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)"
      >
        {/* A 38×54 spine is too small for CoverTile's fixed 15px vertical
            type, so the miniature is local: real cover art when this device
            has it, palette colour + vertical title otherwise. */}
        <span
          aria-hidden
          className="relative flex h-[54px] w-[38px] shrink-0 justify-center overflow-hidden rounded-(--radius-tile) py-1.5 shadow-(--cover-shadow)"
          style={{ background: surface }}
        >
          {book.coverImage ? (
            /* A data: URL out of IndexedDB — nothing for next/image to fetch
               or cache, so the plain element is correct (same as CoverTile). */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span
              className="font-[family-name:var(--face-jp)] text-[12px] leading-none font-medium [writing-mode:vertical-rl]"
              style={{ color: ink }}
            >
              {book.title}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-[9px]">
            <span className="min-w-0 truncate font-[family-name:var(--face-ui)] text-[15px] font-bold text-(--ink)">
              {book.title}
            </span>
            {book.author && (
              <span className="min-w-0 truncate font-[family-name:var(--face-mono)] text-[10px] text-(--faint)">
                {book.author}
              </span>
            )}
          </span>
          <span aria-hidden className="mt-[9px] block h-[5px] overflow-hidden rounded-[3px] bg-(--track)">
            <span className="block h-full" style={{ width: `${pct}%`, background: fill }} />
          </span>
        </span>

        <span
          className={cn(
            'shrink-0 pl-3.5 text-right font-[family-name:var(--face-mono)] text-[12px] tabular-nums',
            book.finished ? 'text-(--gold)' : 'text-(--soft)',
          )}
        >
          {book.finished ? 'Finished' : `${pct}%`}
        </span>
      </Link>
    </li>
  );
}
