'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, Layers, ChevronRight, User, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import { useBubble } from '@/components/providers/BubbleProvider';
import { StampMark } from '@/components/theme-decorations/stamp/StampMark';
import { getDeviceBooks } from '@/lib/devicesApi';
import type { DeviceBookRecord } from '@/lib/types';
import { getDeviceId } from '@/lib/storage/device';
import type { BubbleKey } from '@/components/WorkspaceNav';
import {
  CoverMini,
  DictEntry,
  NavDemoCompact,
  OnboardingCard,
  RECENT_LOOKUPS,
} from '@/components/home/HomeView/HomeDemos';

type Destination = {
  k: 'reader' | 'dict' | 'decks' | 'profile';
  path?: string;
  bubble?: BubbleKey;
  icon: LucideIcon;
  label: string;
  dot: string;
  desc: string;
};

const DESTINATIONS: Destination[] = [
  { k: 'reader',  path: '/reader',     icon: BookOpen, label: 'Reader',     dot: '#D97757', desc: 'Read with tap-to-look-up and inline context.' },
  { k: 'dict',    path: '/dictionary', icon: Search,   label: 'Dictionary', dot: '#4B7AA3', desc: 'Full JMdict entries, kanji breakdown, audio.'  },
  { k: 'decks',   path: '/decks',      icon: Layers,   label: 'Decks',      dot: '#8FB08A', desc: 'Flashcards built from what you read.'         },
  { k: 'profile', bubble: 'profile',   icon: User,     label: 'Profile',    dot: '#B5A27C', desc: 'Account, themes, and reading history.'        },
];

export default function HomeView() {
  const router = useRouter();
  const { user } = useAuth();
  const { setPendingBookOpen } = useReaderState();
  const { setActiveBubble } = useBubble();

  const [recent, setRecent] = useState<DeviceBookRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const deviceId = getDeviceId();
    getDeviceBooks(deviceId, user.id)
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
    (d: Destination) => {
      if (d.bubble) {
        setActiveBubble(d.bubble);
        return;
      }
      if (d.path) {
        router.push(d.path);
      }
    },
    [router, setActiveBubble],
  );

  const resumeBook = useCallback(
    (book: DeviceBookRecord) => {
      if (book.available) setPendingBookOpen(book.filename);
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
        <OpenerStamp
          title={epigraphTitle}
          author={epigraphAuthor}
          isResume={!!currentlyReading}
        />

        <section style={{ marginTop: 40 }}>
          <SectionLabel>What&apos;s in here</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            {DESTINATIONS.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.k}
                  type="button"
                  onClick={() => goToDestination(d)}
                  className="lgc-card lgc-pressable text-left"
                  style={{
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
                        borderRadius: 0,
                        border: '1px solid var(--lgc-fg)',
                        background: d.dot,
                        color: 'var(--lgc-bg)',
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
                        fontWeight: 600,
                        letterSpacing: '0.02em',
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
                style={{ borderRadius: 0 }}
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
                      borderRadius: 0,
                      boxShadow: i === 0 ? '3px 3px 0 var(--lgc-fg)' : undefined,
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
                        {!b.available && <span style={{ marginLeft: 8 }}>· not on this device</span>}
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
        fontFamily: 'var(--lgc-font-mono)',
        fontSize: 11,
        color: 'var(--lgc-accent)',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        fontWeight: 500,
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span>{children}</span>
      <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--lgc-fg-subtle)', opacity: 0.5 }} />
    </div>
  );
}

function OpenerStamp({ title, author, isResume }: { title: string; author: string; isResume: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 40,
        paddingBottom: 32,
        borderBottom: '2px solid var(--lgc-fg)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--lgc-font-display)',
            fontSize: 18,
            letterSpacing: '0.4em',
            color: 'var(--lgc-accent)',
            marginBottom: 14,
          }}
        >
          語 境 · 切 手
        </div>

        <h1
          style={{
            fontFamily: 'var(--lgc-font-display)',
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 6px',
            lineHeight: 1.05,
            color: 'var(--lgc-fg)',
          }}
        >
          Where to today?
        </h1>

        <p
          style={{
            fontFamily: 'var(--lgc-font-ui)',
            fontSize: 15,
            maxWidth: 580,
            color: 'var(--lgc-fg-muted)',
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {isResume
            ? `Picking up where you left off in ${author}「${title}」. Or wander into the dictionary, the deck, or a fresh book — no schedule, no streak.`
            : 'Read in Japanese with tap-to-look-up, a full JMdict dictionary, and decks that grow from what you read. Pick a place that feels right today.'}
        </p>

        <div
          style={{
            fontFamily: 'var(--lgc-font-mono)',
            fontSize: 11,
            color: 'var(--lgc-fg-subtle)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginTop: 14,
            display: 'flex',
            gap: 18,
          }}
        >
          <span>
            CURRENT &nbsp;
            <b style={{ color: 'var(--lgc-accent)', fontWeight: 500 }}>
              {title}
            </b>
          </span>
          <span>&middot;</span>
          <span>{author}</span>
        </div>
      </div>

      <StampMark size={96} rotate={-6}>語</StampMark>
    </div>
  );
}
