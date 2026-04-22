'use client';

import { useEffect, useRef, useState } from 'react';
import { CloudOff, MoreHorizontal, Trash2 } from 'lucide-react';

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
