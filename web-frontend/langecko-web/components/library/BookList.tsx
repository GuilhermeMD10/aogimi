'use client';

import { useEffect, useRef, useState } from 'react';
import { CloudOff, MoreHorizontal, Trash2 } from 'lucide-react';
import { Denomination } from '@/components/theme-decorations/stamp/Denomination';
import { PerforationStrip } from '@/components/theme-decorations/stamp/PerforationStrip';

// ── Merged book type ────────────────────────────────────────────────────────

export interface LibraryBook {
  /** Local IndexedDB id (filename), or backend UUID for unavailable books */
  id: string;
  title: string;
  author: string;
  filename: string;
  coverColor: string;
  hasCover: boolean;
  coverImage?: string;
  progress: number;
  /** Whether the EPUB file exists locally on this device */
  available: boolean;
  /** Backend book UUID (for device availability tracking) */
  backendId?: string;
}

// ── Book cover swatch ───────────────────────────────────────────────────────

export function BookCoverSwatch({
  book,
  size = 'sm',
}: {
  book: { hasCover: boolean; coverImage?: string; coverColor: string };
  size?: 'sm' | 'md';
}) {
  const dims = size === 'sm' ? 'w-3.5 h-5' : 'w-5 h-6.5';

  if (book.hasCover && book.coverImage) {
    return (
      <img
        src={book.coverImage}
        alt=""
        className={`${dims} shrink-0 rounded-sm object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dims} shrink-0 rounded-sm`}
      style={{ background: book.coverColor }}
    />
  );
}

// ── Main table row ──────────────────────────────────────────────────────────

export function BookTableRow({
  book,
  onOpen,
  onLocate,
  onDelete,
}: {
  book: LibraryBook;
  onOpen: () => void;
  onLocate: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Close menu on outside click or scroll
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', close, true);
    };
  }, [menuOpen]);

  return (
    <div
      className={`grid w-full items-center border-b border-lgc-border px-3.5 py-2.5 text-left text-[13px] last:border-b-0 hover:bg-lgc-bg-sunken/50 ${
        !book.available ? 'opacity-60' : ''
      }`}
      style={{ gridTemplateColumns: '32px 1fr 140px 36px' }}
    >
      <button type="button" className="contents cursor-pointer" onClick={book.available ? onOpen : onLocate}>
        <BookCoverSwatch book={book} size="md" />
        <div className="min-w-0">
          <div
            className="truncate text-sm text-lgc-fg"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {book.title}
          </div>
          <div className="text-[11px] text-lgc-fg-muted">
            {book.available ? book.author : (
              <span className="flex items-center gap-1">
                <CloudOff size={10} /> File not on this device
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {book.available ? (
            <>
              <div className="h-1 flex-1 rounded-full bg-lgc-bg-sunken">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${book.progress}%`,
                    background:
                      book.progress === 100
                        ? 'var(--lgc-fg-muted)'
                        : 'var(--lgc-accent)',
                  }}
                />
              </div>
              <span
                className="min-w-7 text-right text-[10px] text-lgc-fg-muted"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {book.progress}%
              </span>
            </>
          ) : (
            <span className="text-[11px] text-lgc-accent">Locate file</span>
          )}
        </div>
      </button>
      <div className="text-right">
        <button
          ref={btnRef}
          type="button"
          onClick={() => {
            if (!menuOpen && btnRef.current) {
              const rect = btnRef.current.getBoundingClientRect();
              setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 });
            }
            setMenuOpen(prev => !prev);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div
            ref={menuRef}
            className="fixed z-50 w-44 overflow-hidden rounded-lg border border-lgc-border-strong bg-lgc-bg-elev shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-500 transition-colors hover:bg-lgc-bg-sunken"
            >
              <Trash2 size={13} /> Delete book
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stamp variant — vertical postage-card with perforated edges ─────────────

// Pull a CJK character from the title to use as the corner seal. Falls back
// to the first letter (uppercased), or 読 if neither is available.
const CJK_REGEX = /[぀-ゟ゠-ヿ一-鿿]/u;
function deriveSealChar(title: string): string {
  const cjk = title.match(CJK_REGEX);
  if (cjk) return cjk[0];
  const first = title[0];
  if (first) return first.toUpperCase();
  return '読';
}

export function BookStampCard({
  book,
  onOpen,
  onLocate,
  onDelete,
}: {
  book: LibraryBook;
  onOpen: () => void;
  onLocate: () => void;
  onDelete: () => void;
}) {
  const handleOpen = () => {
    if (book.available) onOpen();
    else onLocate();
  };

  const sealChar = deriveSealChar(book.title);

  const hasCover = book.hasCover && Boolean(book.coverImage);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
      className="lgc-card lgc-pressable group relative flex cursor-pointer flex-col"
      style={{
        padding: 0,
        opacity: book.available ? 1 : 0.6,
      }}
    >
      {/* Perforated top + bottom edges */}
      <PerforationStrip side="top" />
      <PerforationStrip side="bottom" />

      {/* ── Cover hero — fills the top area, denom + seal overlay it ──── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3 / 4',
          background: hasCover ? undefined : book.coverColor,
          borderBottom: '1px solid var(--lgc-fg)',
          overflow: 'hidden',
        }}
      >
        {hasCover ? (
          <img
            src={book.coverImage}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : null}

        {/* Denomination — overlay top-left with a paper plate for readability */}
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'var(--lgc-bg)',
            padding: '4px 6px',
            border: '1px solid var(--lgc-fg)',
            display: 'inline-flex',
          }}
        >
          <Denomination value={book.progress} caption="% READ" />
        </span>

        {/* Hanko-style corner seal — overlay top-right */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 28,
            height: 28,
            background: 'var(--lgc-accent)',
            color: 'var(--lgc-accent-fg)',
            fontFamily: 'var(--lgc-font-display)',
            fontWeight: 700,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: '0.04em',
            transform: 'rotate(8deg)',
            boxShadow: 'inset 0 0 0 1px var(--lgc-bg), 0 1px 2px rgba(0,0,0,0.25)',
          }}
        >
          {sealChar}
        </span>
      </div>

      {/* ── Text + footer block below the cover ─────────────────────── */}
      <div
        style={{
          padding: '12px 14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: 'var(--lgc-font-display)',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.02em',
            textAlign: 'center',
            color: 'var(--lgc-fg)',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {book.title}
        </div>

        {/* Author */}
        <div
          style={{
            fontSize: 11,
            color: 'var(--lgc-fg-subtle)',
            textAlign: 'center',
            fontStyle: 'italic',
            lineHeight: 1.35,
          }}
        >
          {book.available
            ? book.author
            : (
              <span className="inline-flex items-center gap-1">
                <CloudOff size={10} /> File not on this device
              </span>
            )}
        </div>

        {/* Footer bar */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--lgc-fg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'var(--lgc-font-mono)',
            fontSize: 9,
            letterSpacing: '0.2em',
            color: 'var(--lgc-fg)',
            textTransform: 'uppercase',
          }}
        >
          <span>日 本</span>
          <span>{book.available ? `${book.progress}%` : 'Locate'}</span>
        </div>
      </div>

      {/* Hover-reveal delete */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Delete ${book.title}`}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          position: 'absolute',
          bottom: 6,
          right: 6,
          width: 22,
          height: 22,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--lgc-fg-muted)',
          background: 'var(--lgc-bg)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
