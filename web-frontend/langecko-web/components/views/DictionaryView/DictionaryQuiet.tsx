'use client';

// Quiet desk pieces for /dictionary. Each block is exported so DictionaryView
// can compose them; the entire desk is always rendered (hero + tips + recent
// + how-it-works) regardless of search state, so layout never shifts when a
// result lands. Results, when present, slot in between the hero and the tips
// row inside DictionaryView.

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Bookmark, ChevronRight, Search, X } from 'lucide-react';
import { useDictionaryState } from '@/components/providers/DictionaryStateProvider';
import { getRecentSearches, type RecentSearchItem } from '@/lib/storage/dictionary';

// ── Hero (always rendered at top of /dictionary) ────────────────────────────

export function DictionaryHero() {
  const { query, setQuery, runSearch, reset, loading, result } = useDictionaryState();
  const inputRef = useRef<HTMLInputElement>(null);

  // `/` from anywhere on the page focuses the hero (skip when typing in
  // another input/textarea so we don't fight other components).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-focus on mount.
  useEffect(() => { inputRef.current?.focus(); }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(query);
  };

  const showClear = Boolean(query) || Boolean(result);

  return (
    <div style={{ position: 'relative', textAlign: 'center', paddingTop: 12 }}>
      <span
        aria-hidden
        className="font-display"
        style={{
          display: 'block',
          fontSize: 60,
          fontWeight: 400,
          color: 'var(--lgc-fg)',
          opacity: 0.08,
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        辞書
      </span>

      <h1
        className="font-display"
        style={{
          margin: '12px 0 0',
          fontSize: 36,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: 'var(--lgc-fg)',
          lineHeight: 1.15,
        }}
      >
        Look something up
      </h1>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: 13.5,
          color: 'var(--lgc-fg-muted)',
        }}
      >
        Kanji, kana, or English. JMdict and the books you&rsquo;ve read.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 28 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '18px 22px',
            background: 'var(--lgc-bg-elev)',
            border: '1px solid var(--lgc-border-strong)',
            borderRadius: 'var(--lgc-input-radius, 12px)',
            boxShadow: 'var(--lgc-shadow, 0 1px 2px rgba(0,0,0,0.04))',
            transition: 'border-color 120ms, box-shadow 120ms',
          }}
          onFocus={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = 'var(--lgc-accent)';
            el.style.boxShadow = '0 0 0 4px var(--lgc-ring, color-mix(in oklab, var(--lgc-accent) 24%, transparent))';
          }}
          onBlur={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = 'var(--lgc-border-strong)';
            el.style.boxShadow = 'var(--lgc-shadow, 0 1px 2px rgba(0,0,0,0.04))';
          }}
        >
          <Search size={18} style={{ color: 'var(--lgc-fg-subtle)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="辞書を引く…"
            className="font-display"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 22,
              color: 'var(--lgc-fg)',
              caretColor: 'var(--lgc-accent)',
              letterSpacing: '-0.005em',
              textAlign: 'left',
            }}
          />
          {loading && (
            <span
              style={{
                fontFamily: 'var(--lgc-font-mono)',
                fontSize: 11,
                color: 'var(--lgc-fg-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              Searching…
            </span>
          )}
          {showClear && !loading && (
            <button
              type="button"
              onClick={reset}
              aria-label="Clear search"
              title="Clear search"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Tips row ────────────────────────────────────────────────────────────────

export function TipsRow() {
  const tips = useMemo(
    () => [
      { kbd: '/',         text: 'focus search' },
      { kbd: 'Enter',     text: 'open top hit' },
      { kbd: '⇧ Enter',   text: 'send to flashcard' },
      { kbd: '⌥ + paste', text: 'auto-detect kanji' },
    ],
    [],
  );
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: 18,
      }}
    >
      {tips.map((t) => (
        <span
          key={t.kbd}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--lgc-fg-muted)',
          }}
          title={t.text}
        >
          <kbd
            style={{
              fontFamily: 'var(--lgc-font-mono)',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--lgc-fg)',
              background: 'var(--lgc-bg-sunken)',
              border: '1px solid var(--lgc-border)',
              borderRadius: 4,
              padding: '1px 6px',
            }}
          >{t.kbd}</kbd>
          {t.text}
        </span>
      ))}
    </div>
  );
}

// ── Recent column ───────────────────────────────────────────────────────────

export function RecentColumn() {
  const { setQuery, runSearch } = useDictionaryState();
  const [items, setItems] = useState<RecentSearchItem[]>([]);
  useEffect(() => { setItems(getRecentSearches()); }, []);
  const onPick = (q: string) => { setQuery(q); void runSearch(q); };
  return <RecentColumnImpl items={items} onPick={onPick} />;
}

function RecentColumnImpl({
  items,
  onPick,
}: {
  items: RecentSearchItem[];
  onPick: (q: string) => void;
}) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <SectionHead>Recent</SectionHead>
        <span
          style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--lgc-fg-subtle)' }}
          title="Recent lookups are stored on this device only. Server sync is coming."
        >
          (saved locally — server sync coming soon)
        </span>
      </div>

      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--lgc-fg-muted)', lineHeight: 1.5 }}>
          Open a book and tap a word — your lookups will land here.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.slice(0, 5).map((it, i) => (
            <button
              key={`${it.query}-${i}`}
              type="button"
              onClick={() => onPick(it.query)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 6px',
                borderBottom: '1px solid var(--lgc-border)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--lgc-bg-elev)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span
                className="font-display"
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: 'var(--lgc-fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {it.query}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--lgc-font-mono)',
                  color: 'var(--lgc-fg-muted)',
                }}
              >
                {formatRelative(it.at)}
              </span>
              <ChevronRight size={12} style={{ color: 'var(--lgc-fg-subtle)' }} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ── How it works column ─────────────────────────────────────────────────────

export function HowItWorksColumn() {
  return (
    <section>
      <SectionHead>How it works</SectionHead>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        <Step
          n="01"
          icon={<Search size={16} />}
          title="Open from anywhere"
          body={<>In the reader, tap any word — or hit <Kbd>/</Kbd> from any screen. The dictionary slides in beside the page you were reading. No context lost.</>}
        />
        <Step
          n="02"
          icon={<BookOpen size={16} />}
          title="Look up, not switch"
          body={<>Definitions, readings, and example sentences pull from JMdict and the books you&rsquo;ve actually read. Click any kanji to drill into its components.</>}
        />
        <Step
          n="03"
          icon={<Bookmark size={16} />}
          title="One press → flashcard"
          body={<>Save to a deck with <Kbd>S</Kbd>. Langeco picks the right deck based on the book — you can override with <Kbd>⇧S</Kbd>. Reviews show up in your daily queue.</>}
        />
      </div>
    </section>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr',
        gap: 14,
        padding: '14px 16px',
        background: 'var(--lgc-bg-elev)',
        border: '1px solid var(--lgc-border)',
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--lgc-accent-soft, color-mix(in oklab, var(--lgc-accent) 14%, transparent))',
          color: 'var(--lgc-accent)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: 'var(--lgc-font-mono)',
              fontWeight: 700,
              color: 'var(--lgc-accent)',
              letterSpacing: '0.12em',
            }}
          >
            {n}
          </span>
          <h4
            className="font-display"
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: 'var(--lgc-fg)',
            }}
          >
            {title}
          </h4>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--lgc-fg-muted)', lineHeight: 1.55 }}>
          {body}
        </p>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--lgc-fg-muted)',
      }}
    >
      {children}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        display: 'inline-block',
        fontFamily: 'var(--lgc-font-mono)',
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--lgc-fg)',
        background: 'var(--lgc-bg-sunken)',
        border: '1px solid var(--lgc-border)',
        borderRadius: 3,
        padding: '0 4px',
      }}
    >
      {children}
    </kbd>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
