'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, Layers, ChevronRight, User, type LucideIcon } from 'lucide-react';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import { useReaderState } from '@/features/app-shell/providers/ReaderStateProvider';
import { getUserBooks } from '@/features/books';
import type { BookProgressRecord } from '@/features/books/types';
import {
  CoverMini,
  DictEntry,
  NavDemoCompact,
  OnboardingCard,
  RECENT_LOOKUPS,
} from './HomeDemos';

type Destination = {
  k: 'reader' | 'dict' | 'decks' | 'profile';
  path: string;
  icon: LucideIcon;
  label: string;
  dot: string;
  desc: string;
};

const DESTINATIONS: Destination[] = [
  { k: 'reader',  path: '/reader',     icon: BookOpen, label: 'Reader',     dot: '#D97757', desc: 'Read with tap-to-look-up and inline context.' },
  { k: 'dict',    path: '/dictionary', icon: Search,   label: 'Dictionary', dot: '#4B7AA3', desc: 'Full JMdict entries, kanji breakdown, audio.'  },
  { k: 'decks',   path: '/decks',      icon: Layers,   label: 'Decks',      dot: '#8FB08A', desc: 'Flashcards built from what you read.'         },
  { k: 'profile', path: '/profile',    icon: User,     label: 'Profile',    dot: '#B5A27C', desc: 'Account and reading history.'                 },
];

export default function HomeView() {
  const router = useRouter();
  const user = useAuthedUser();
  const { setPendingBookOpen } = useReaderState();

  const [recent, setRecent] = useState<BookProgressRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    getUserBooks(user.id)
      .then((books) => {
        if (cancelled) return;
        const sorted = [...books].sort(
          (a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime(),
        );
        setRecent(sorted.slice(0, 3));
      })
      .catch(() => { /* leave list empty */ });
    return () => { cancelled = true; };
  }, [user]);

  const goToDestination = useCallback(
    (d: Destination) => router.push(d.path),
    [router],
  );

  const resumeBook = useCallback(
    (book: BookProgressRecord) => {
      // The reader-tab open handler checks for local file presence;
      // setting `pendingBookOpen` unconditionally is safe — if the
      // file isn't on this device the reader surfaces the locate
      // affordance there.
      setPendingBookOpen(book.filename);
      router.push('/reader');
    },
    [router, setPendingBookOpen],
  );

  const currentlyReading = recent[0];
  const epigraphTitle = currentlyReading?.title ?? 'こゝろ';
  const epigraphAuthor = currentlyReading?.author ?? '夏目 漱石';

  return (
    <div className="h-full w-full overflow-auto lgc-scroll" style={{ background: 'var(--lgc-bg)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '52px 48px 140px' }}>
        <OpenerLiterary
          title={epigraphTitle}
          author={epigraphAuthor}
          isResume={!!currentlyReading}
        />

        <section style={{ marginTop: 40 }}>
          <SectionLabel>What&apos;s in here</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {DESTINATIONS.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.k}
                  type="button"
                  onClick={() => goToDestination(d)}
                  className="text-left transition-colors hover:bg-lgc-bg-sunken/40"
                  style={{
                    background: 'var(--lgc-bg-elev)',
                    border: '1px solid var(--lgc-border)',
                    borderRadius: 14,
                    padding: '20px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    color: 'var(--lgc-fg)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `color-mix(in oklab, ${d.dot} 14%, transparent)`,
                        color: d.dot,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <ChevronRight size={13} style={{ color: 'var(--lgc-fg-subtle)' }} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--lgc-font-display)',
                        fontSize: 18,
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {d.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--lgc-fg-muted)', marginTop: 4, lineHeight: 1.5 }}>
                      {d.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 40 }}>
          <div>
            <SectionLabel>Recently opened</SectionLabel>
            {recent.length === 0 ? (
              <div
                className="border border-dashed border-lgc-border-strong px-5 py-8 text-[13px] text-lgc-fg-muted"
                style={{ borderRadius: 8 }}
              >
                Nothing yet — import an EPUB from the Reader to get started.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recent.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => resumeBook(b)}
                    className="text-left transition-colors hover:bg-lgc-bg-sunken/30"
                    style={{
                      display: 'flex',
                      gap: 16,
                      padding: '14px 14px',
                      background: i === 0 ? 'var(--lgc-bg-elev)' : 'transparent',
                      border: i === 0 ? '1px solid var(--lgc-border)' : '1px solid transparent',
                      borderBottom: '1px solid var(--lgc-border)',
                      borderRadius: i === 0 ? 12 : 0,
                      alignItems: 'center',
                      marginBottom: i === 0 ? 6 : 0,
                      cursor: 'pointer',
                    }}
                  >
                    <CoverMini
                      title={b.title}
                      color={b.cover_color}
                      w={i === 0 ? 62 : 40}
                      h={i === 0 ? 88 : 56}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {i === 0 && (
                        <div
                          style={{
                            fontSize: 9.5,
                            color: 'var(--lgc-accent)',
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: 3,
                          }}
                        >
                          Currently reading
                        </div>
                      )}
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: i === 0 ? 19 : 15,
                          fontWeight: 500,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {b.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--lgc-fg-muted)', marginTop: 1 }}>
                        {b.author}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <div
                          style={{
                            flex: 1,
                            maxWidth: 240,
                            height: 2,
                            background: 'var(--lgc-bg-sunken)',
                            borderRadius: 99,
                          }}
                        >
                          <div
                            style={{
                              width: `${b.progress}%`,
                              height: '100%',
                              background:
                                b.progress === 100 ? '#81C784' : 'var(--lgc-accent)',
                              borderRadius: 99,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--lgc-fg-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {b.progress}%
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionLabel>Recent lookups</SectionLabel>
            <div
              style={{
                background: 'var(--lgc-bg-elev)',
                border: '1px solid var(--lgc-border)',
                borderRadius: 12,
                padding: '6px 14px',
              }}
            >
              {RECENT_LOOKUPS.map((q, i) => (
                <DictEntry key={i} q={q} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => router.push('/dictionary')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 10,
                fontSize: 11.5,
                color: 'var(--lgc-fg-muted)',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                padding: 0,
              }}
            >
              Open dictionary <ChevronRight size={11} />
            </button>
          </div>
        </section>

        <section style={{ marginTop: 56 }}>
          <SectionLabel>Getting around</SectionLabel>
          <OnboardingCard
            demo={<NavDemoCompact />}
            title="A bottom bar, always within reach"
            body={
              <>
                Three places on the left — <span style={{ color: 'var(--lgc-fg)' }}>Reader, Dictionary, Decks</span>.
                Tap to open, tap again to close. On the right, small windows float open for{' '}
                <span style={{ color: 'var(--lgc-fg)' }}>Home, Profile, Settings</span> without taking over.
              </>
            }
            demoPad="12px 0 14px"
          />
        </section>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: 'var(--lgc-fg-muted)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 700,
        marginBottom: 14,
      }}
    >
      <span>{children}</span>
    </div>
  );
}

function OpenerLiterary({
  title,
  author,
  isResume,
}: {
  title: string;
  author: string;
  isResume: boolean;
}) {
  const epigraph = useMemo(
    () => '「私はその人の記憶を呼び起すごとに、すぐ『先生』といいたくなる。」',
    [],
  );

  return (
    <div style={{ position: 'relative', paddingBottom: 4 }}>
      <div
        style={{
          fontSize: 11,
          color: 'var(--lgc-accent)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontWeight: 700,
          fontFamily: 'var(--font-ui)',
        }}
      >
        Aogimi · 導
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 40,
          alignItems: 'end',
          marginTop: 14,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              color: 'var(--lgc-fg)',
              fontStyle: 'italic',
              fontWeight: 400,
              letterSpacing: '-0.01em',
              lineHeight: 1.25,
              maxWidth: 640,
            }}
          >
            {epigraph}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--lgc-fg-muted)',
              marginTop: 10,
              fontStyle: 'italic',
              letterSpacing: '0.01em',
            }}
          >
            — {author}「{title}」{isResume ? ' · picked up where you left off' : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--lgc-fg)',
              fontStyle: 'italic',
            }}
          >
            Where to?
          </div>
          <div style={{ fontSize: 12, color: 'var(--lgc-fg-muted)', marginTop: 6, maxWidth: 260 }}>
            No schedule. Pick a place that feels right today.
          </div>
        </div>
      </div>
    </div>
  );
}
