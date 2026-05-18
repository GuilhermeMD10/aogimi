'use client';

// Library landing — the screen the user sees on /reader before opening a book.
// Composes:
//   <LibraryHeader>     eyebrow / title / subtitle / search / sort / Import EPUB
//   <FilterChips>       All · Reading · Up next · Finished + sort label
//   <ContinuePanel>     hero for the most-recently-read book (skipped when none)
//   grid of <BookCard>  every other book (excludes the hero)
//
// All colors come from CSS tokens so themes (default + hanami at minimum) just
// work. No JLPT level or cover patterns yet — those columns are not in the
// backend.

import { useEffect, useMemo, useRef, useState } from 'react';
import { CloudOff, MoreHorizontal, Plus, Search, Pencil, CheckCircle2, Trash2, BookOpen, ArrowUpDown } from 'lucide-react';
import type { LibraryBook } from '@/components/library/BookList';

type Filter = 'all' | 'reading' | 'upnext' | 'finished';

export type LibraryDeskProps = {
  books: LibraryBook[];
  importing: boolean;
  onOpen: (book: LibraryBook) => void;
  onImport: () => void;
  onRename: (book: LibraryBook, title: string) => void;
  onMarkFinished: (book: LibraryBook) => void;
  onRemove: (book: LibraryBook) => void;
  onLocate: (book: LibraryBook) => void;
  /** Optional content rendered below the grid (e.g. filesystem-access banner). */
  footer?: React.ReactNode;
};

export function LibraryDesk({
  books,
  importing,
  onOpen,
  onImport,
  onRename,
  onMarkFinished,
  onRemove,
  onLocate,
  footer,
}: LibraryDeskProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // `/` focuses search from anywhere on the page (not while typing in inputs).
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

  // Sort newest-read first; books without lastReadAt sink to the bottom but
  // keep their original order (stable enough — the array starts merged).
  const sorted = useMemo(() => {
    return [...books].sort((a, b) => {
      const ta = a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0;
      const tb = b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0;
      return tb - ta;
    });
  }, [books]);

  const hero = sorted.find((b) => b.lastReadAt && b.progress > 0 && b.progress < 100) ?? null;
  const grid = hero ? sorted.filter((b) => b.id !== hero.id) : sorted;

  const counts = useMemo(() => {
    const reading = books.filter((b) => b.progress > 0 && b.progress < 100).length;
    const upnext = books.filter((b) => b.progress === 0).length;
    const finished = books.filter((b) => b.progress === 100).length;
    return { all: books.length, reading, upnext, finished };
  }, [books]);

  const q = query.trim().toLowerCase();
  const filteredGrid = useMemo(() => {
    return grid.filter((b) => {
      if (q) {
        const hay = `${b.title} ${b.author}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (filter) {
        case 'reading':  return b.progress > 0 && b.progress < 100;
        case 'upnext':   return b.progress === 0;
        case 'finished': return b.progress === 100;
        default:         return true;
      }
    });
  }, [grid, q, filter]);

  return (
    <div className="h-full overflow-auto" style={{ background: 'var(--lgc-bg)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '34px 40px 140px' }}>
        <LibraryHeader
          searchRef={searchRef}
          query={query}
          setQuery={setQuery}
          counts={counts}
          importing={importing}
          onImport={onImport}
        />

        <FilterChips filter={filter} setFilter={setFilter} counts={counts} />

        {hero && (
          <ContinuePanel
            book={hero}
            onResume={() => onOpen(hero)}
            onRename={(title) => onRename(hero, title)}
            onRemove={() => onRemove(hero)}
          />
        )}

        <div style={{ marginTop: hero ? 36 : 8, display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
          <SectionLabel>{filter === 'all' ? 'All books' : labelForFilter(filter)}</SectionLabel>
          <span style={{ fontSize: 11, color: 'var(--lgc-fg-muted)', fontFamily: 'var(--lgc-font-mono)' }}>
            {filteredGrid.length}
          </span>
        </div>

        {filteredGrid.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              columnGap: 28,
              rowGap: 32,
            }}
          >
            {filteredGrid.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpen={() => (book.available ? onOpen(book) : onLocate(book))}
                onRename={(title) => onRename(book, title)}
                onMarkFinished={() => onMarkFinished(book)}
                onRemove={() => onRemove(book)}
              />
            ))}
          </div>
        ) : books.length === 0 ? (
          <EmptyLibrary onImport={onImport} importing={importing} />
        ) : (
          <p style={{ marginTop: 8, fontSize: 13, color: 'var(--lgc-fg-muted)' }}>
            No books match this filter.
          </p>
        )}

        {footer && <div style={{ marginTop: 32 }}>{footer}</div>}
      </div>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

function LibraryHeader({
  searchRef,
  query,
  setQuery,
  counts,
  importing,
  onImport,
}: {
  searchRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  counts: { all: number; reading: number; finished: number };
  importing: boolean;
  onImport: () => void;
}) {
  const subtitleParts: string[] = [];
  subtitleParts.push(`${counts.all} ${counts.all === 1 ? 'book' : 'books'}`);
  if (counts.reading > 0) subtitleParts.push(`${counts.reading} in progress`);
  if (counts.finished > 0) subtitleParts.push(`${counts.finished} finished`);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 22 }}>
      <div style={{ minWidth: 0 }}>
        <div className="lgc-section-label" style={{ marginBottom: 4 }}>Your library</div>
        <h1
          className="font-display"
          style={{
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: '-0.018em',
            color: 'var(--lgc-fg)',
            lineHeight: 1.1,
          }}
        >
          Your books
        </h1>
        <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--lgc-fg-muted)' }}>
          {subtitleParts.join(' · ')}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <SearchInput inputRef={searchRef} value={query} onChange={setQuery} />
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev"
          title="Sort (last opened)"
        >
          <span className="flex items-center gap-1.5">
            <ArrowUpDown size={13} /> Sort
          </span>
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={importing}
          className="flex items-center gap-1.5 rounded-md border border-lgc-border-strong px-3 py-1.5 text-[13px] font-medium text-lgc-fg transition-colors hover:bg-lgc-bg-elev disabled:opacity-50"
        >
          <Plus size={13} />
          {importing ? 'Importing…' : 'Import EPUB'}
        </button>
      </div>
    </div>
  );
}

function SearchInput({
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--lgc-bg-elev)',
        border: '1px solid var(--lgc-border-strong)',
        borderRadius: 'var(--lgc-input-radius, 8px)',
        padding: '6px 10px',
        minWidth: 220,
      }}
    >
      <Search size={13} style={{ color: 'var(--lgc-fg-subtle)', flexShrink: 0 }} />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search title or author"
        className="flex-1 border-none bg-transparent text-[13px] text-lgc-fg outline-none placeholder:text-lgc-fg-subtle"
      />
      <kbd
        style={{
          fontFamily: 'var(--lgc-font-mono)',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--lgc-fg-subtle)',
          background: 'var(--lgc-bg-sunken)',
          border: '1px solid var(--lgc-border)',
          borderRadius: 4,
          padding: '1px 5px',
        }}
      >/</kbd>
    </div>
  );
}

// ── Filter chips ────────────────────────────────────────────────────────────

function FilterChips({
  filter,
  setFilter,
  counts,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  counts: { all: number; reading: number; upnext: number; finished: number };
}) {
  const items: { key: Filter; label: string; count: number }[] = [
    { key: 'all',      label: 'All',       count: counts.all },
    { key: 'reading',  label: 'Reading',   count: counts.reading },
    { key: 'upnext',   label: 'Up next',   count: counts.upnext },
    { key: 'finished', label: 'Finished',  count: counts.finished },
  ];

  return (
    <div role="tablist" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 22 }}>
      {items.map((it) => {
        const active = filter === it.key;
        return (
          <button
            key={it.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => setFilter(it.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid',
              borderColor: active ? 'var(--lgc-fg)' : 'var(--lgc-border)',
              background: active ? 'var(--lgc-fg)' : 'transparent',
              color: active ? 'var(--lgc-bg-elev)' : 'var(--lgc-fg-muted)',
              cursor: 'pointer',
              transition: 'background-color 120ms, color 120ms, border-color 120ms',
            }}
          >
            {it.label}
            <span style={{ fontFamily: 'var(--lgc-font-mono)', fontSize: 10.5, opacity: 0.85 }}>{it.count}</span>
          </button>
        );
      })}

      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--lgc-fg-muted)', fontFamily: 'var(--lgc-font-mono)' }}>
        Sorted by · last opened
      </span>
    </div>
  );
}

// ── Continue (hero) ─────────────────────────────────────────────────────────

function ContinuePanel({
  book,
  onResume,
  onRename,
  onRemove,
}: {
  book: LibraryBook;
  onResume: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(book.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const startEdit = () => { setDraft(book.title); setEditing(true); setMenuOpen(false); };
  const commitEdit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== book.title) onRename(trimmed);
  };
  const cancelEdit = () => { setEditing(false); setDraft(book.title); };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr auto',
        gap: 28,
        alignItems: 'center',
        padding: '28px 32px',
        background: 'var(--lgc-bg-elev)',
        border: '1px solid var(--lgc-border)',
        borderRadius: 14,
        boxShadow: 'var(--lgc-shadow, 0 1px 2px rgba(0,0,0,0.04))',
      }}
    >
      <Cover book={book} width={120} />

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--lgc-accent)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--lgc-accent)' }} />
            <span>Continue reading{book.lastReadAt ? ` · ${formatRelative(book.lastReadAt)}` : ''}</span>
          </div>

          <BookCardMenu
            isOpen={menuOpen}
            setOpen={setMenuOpen}
            title={book.title}
            finished={false}
            onRename={startEdit}
            onMarkFinished={() => { /* not offered on continue panel */ }}
            onRemove={onRemove}
            hideMarkFinished
          />
        </div>

        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
            }}
            onBlur={commitEdit}
            className="font-display"
            style={{
              marginTop: 6,
              width: '100%',
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: '-0.018em',
              lineHeight: 1.15,
              color: 'var(--lgc-fg)',
              background: 'var(--lgc-bg)',
              border: '1px solid var(--lgc-border-strong)',
              borderRadius: 6,
              padding: '2px 8px',
              outline: 'none',
            }}
          />
        ) : (
          <div
            className="font-display"
            style={{
              marginTop: 6,
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: '-0.018em',
              color: 'var(--lgc-fg)',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={book.title}
          >
            {book.title}
          </div>
        )}
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--lgc-fg-muted)' }}>
          {book.author}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, maxWidth: 520 }}>
          <div
            role="progressbar"
            aria-valuenow={book.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background: 'var(--lgc-bg-sunken)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${book.progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--lgc-accent), var(--lgc-accent-2, var(--lgc-accent)))',
              }}
            />
          </div>
          <span style={{ fontSize: 11, fontFamily: 'var(--lgc-font-mono)', color: 'var(--lgc-fg-muted)' }}>
            {book.progress}%
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onResume}
        disabled={!book.available}
        title={book.available ? 'Resume reading' : 'File not on this device'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          borderRadius: 10,
          background: 'var(--lgc-accent)',
          color: 'var(--lgc-accent-fg)',
          border: 'none',
          fontSize: 13,
          fontWeight: 600,
          cursor: book.available ? 'pointer' : 'not-allowed',
          opacity: book.available ? 1 : 0.5,
        }}
      >
        <BookOpen size={14} /> Resume
      </button>
    </div>
  );
}

// ── Book card (grid) ────────────────────────────────────────────────────────

function BookCard({
  book,
  onOpen,
  onRename,
  onMarkFinished,
  onRemove,
}: {
  book: LibraryBook;
  onOpen: () => void;
  onRename: (title: string) => void;
  onMarkFinished: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(book.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const finished = book.progress === 100;
  const muted = !book.available;

  const startEdit = () => { setDraft(book.title); setEditing(true); setMenuOpen(false); };
  const commitEdit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== book.title) onRename(trimmed);
  };
  const cancelEdit = () => { setEditing(false); setDraft(book.title); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <button
        type="button"
        onClick={onOpen}
        title={muted ? 'File not on this device — click to locate' : `Open ${book.title}`}
        style={{
          padding: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          opacity: muted ? 0.6 : 1,
        }}
      >
        <Cover book={book} finished={finished} />
      </button>

      <div
        role="progressbar"
        aria-valuenow={book.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          marginTop: 10,
          marginBottom: 8,
          height: 2,
          borderRadius: 99,
          background: 'var(--lgc-bg-sunken)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${book.progress}%`,
            height: '100%',
            background: finished ? 'var(--lgc-fg-muted)' : 'var(--lgc-accent)',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')   { e.preventDefault(); commitEdit(); }
                if (e.key === 'Escape')  { e.preventDefault(); cancelEdit(); }
              }}
              onBlur={commitEdit}
              className="font-display"
              style={{
                width: '100%',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--lgc-fg)',
                background: 'var(--lgc-bg)',
                border: '1px solid var(--lgc-border-strong)',
                borderRadius: 4,
                padding: '2px 6px',
                outline: 'none',
              }}
            />
          ) : (
            <div
              className="font-display"
              style={{
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: '-0.005em',
                color: 'var(--lgc-fg)',
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={book.title}
            >
              {book.title}
            </div>
          )}
          <div style={{ marginTop: 2, fontSize: 11, color: 'var(--lgc-fg-muted)', fontFamily: 'var(--lgc-font-mono)' }}>
            {muted ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CloudOff size={10} /> not on device
              </span>
            ) : (
              `${book.progress}%`
            )}
          </div>
        </div>

        <BookCardMenu
          isOpen={menuOpen}
          setOpen={setMenuOpen}
          title={book.title}
          finished={finished}
          onRename={startEdit}
          onMarkFinished={onMarkFinished}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}

function BookCardMenu({
  isOpen,
  setOpen,
  title,
  finished,
  onRename,
  onMarkFinished,
  onRemove,
  hideMarkFinished = false,
}: {
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  title: string;
  finished: boolean;
  onRename: () => void;
  onMarkFinished: () => void;
  onRemove: () => void;
  hideMarkFinished?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
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
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={`More actions for ${title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
      >
        <MoreHorizontal size={14} />
      </button>
      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 180,
            background: 'var(--lgc-bg-elev)',
            border: '1px solid var(--lgc-border-strong)',
            borderRadius: 10,
            boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 14px 40px rgba(0,0,0,0.18)',
            padding: 4,
            zIndex: 20,
          }}
        >
          <MenuItem icon={<Pencil size={13} />} onClick={() => { setOpen(false); onRename(); }}>
            Edit title
          </MenuItem>
          {!finished && !hideMarkFinished && (
            <MenuItem icon={<CheckCircle2 size={13} />} onClick={() => { setOpen(false); onMarkFinished(); }}>
              Mark as finished
            </MenuItem>
          )}
          <div style={{ height: 1, background: 'var(--lgc-border)', margin: '4px 0' }} />
          <MenuItem
            icon={<Trash2 size={13} />}
            destructive
            onClick={() => { setOpen(false); onRemove(); }}
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
  destructive = false,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '7px 10px',
        background: 'transparent',
        border: 'none',
        borderRadius: 6,
        fontSize: 12.5,
        color: destructive ? '#c14a3a' : 'var(--lgc-fg)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--lgc-bg-sunken)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Cover (flat color or image, with spine overlay) ─────────────────────────

function Cover({
  book,
  width,
  finished = false,
}: {
  book: LibraryBook;
  width?: number;
  finished?: boolean;
}) {
  const hasImg = book.hasCover && Boolean(book.coverImage);
  return (
    <div
      style={{
        position: 'relative',
        width: width ?? '100%',
        aspectRatio: '2 / 3',
        background: hasImg ? undefined : book.coverColor,
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.18), 0 6px 18px rgba(0,0,0,0.18)',
      }}
    >
      {hasImg ? (
        <img
          src={book.coverImage}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(0,0,0,0.10))',
          }}
        />
      )}

      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '7%',
          top: 0,
          bottom: 0,
          width: 1,
          background: 'rgba(0,0,0,0.22)',
        }}
      />

      {finished && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 7px',
            borderRadius: 99,
            background: 'rgba(255,255,255,0.92)',
            color: '#1f1f1f',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          <CheckCircle2 size={10} /> Finished
        </span>
      )}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyLibrary({ onImport, importing }: { onImport: () => void; importing: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        border: '1px dashed var(--lgc-border-strong)',
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <BookOpen size={28} style={{ color: 'var(--lgc-fg-subtle)', marginBottom: 10 }} />
      <div className="font-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--lgc-fg)' }}>
        Your library is empty
      </div>
      <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--lgc-fg-muted)', maxWidth: 320 }}>
        Drop an EPUB to get started.
      </div>
      <button
        type="button"
        onClick={onImport}
        disabled={importing}
        className="mt-4 flex items-center gap-1.5 rounded-md bg-lgc-accent px-4 py-2 text-sm font-semibold text-lgc-accent-fg transition hover:opacity-90 disabled:opacity-50"
      >
        <Plus size={14} /> {importing ? 'Importing…' : 'Import EPUB'}
      </button>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: 'var(--lgc-fg-muted)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

function labelForFilter(f: Filter): string {
  switch (f) {
    case 'reading':  return 'Reading';
    case 'upnext':   return 'Up next';
    case 'finished': return 'Finished';
    default:         return 'All books';
  }
}

// `2 hours ago` / `Yesterday` / `Apr 12` style. Cheap; no Intl.RelativeTimeFormat
// to keep this a leaf component without locale considerations.
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 7) return `${day} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
