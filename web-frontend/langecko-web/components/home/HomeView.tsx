'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Search,
  Layers,
  Library,
  ChevronRight,
  Star,
  Home,
  User,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import { useWorkspaceTabs } from '@/components/providers/WorkspaceTabsProvider';
import { getDeviceBooks, type DeviceBookRecord } from '@/lib/devicesApi';
import { getDeviceId } from '@/lib/deviceId';
import type { WorkspaceTabKey } from '@/lib/config/tab-config';

// ── Destination cards ──────────────────────────────────────────────────────

type Destination = {
  k: 'reader' | 'dict' | 'decks' | 'library';
  /** Workspace tab to toggle. Library has no dedicated pane yet → falls back to reader. */
  tab: WorkspaceTabKey;
  icon: LucideIcon;
  label: string;
  dot: string;
  desc: string;
};

const DESTINATIONS: Destination[] = [
  { k: 'reader',  tab: 'reader',     icon: BookOpen, label: 'Reader',     dot: '#D97757', desc: 'Read with tap-to-look-up and inline context.' },
  { k: 'dict',    tab: 'dictionary', icon: Search,   label: 'Dictionary', dot: '#4B7AA3', desc: 'Full JMdict entries, kanji breakdown, audio.'  },
  { k: 'decks',   tab: 'cards',      icon: Layers,   label: 'Decks',      dot: '#8FB08A', desc: 'Flashcards built from what you read.'         },
  { k: 'library', tab: 'reader',     icon: Library,  label: 'Library',    dot: '#B5A27C', desc: 'Your books, organised how you like.'          },
];

// ── Recent dictionary lookups (placeholder data per design) ────────────────

type DictPlaceholder = { head: string; reading: string; gloss: string; saved?: boolean };

const RECENT_LOOKUPS: DictPlaceholder[] = [
  { head: '鎌倉',   reading: 'かまくら',   gloss: 'Kamakura (city)',         saved: true  },
  { head: '書生',   reading: 'しょせい',   gloss: 'student (old-fashioned)' },
  { head: '記憶',   reading: 'きおく',     gloss: 'memory; recollection',   saved: true  },
  { head: '暑中',   reading: 'しょちゅう', gloss: 'mid-summer'              },
  { head: '憚かる', reading: 'はばかる',   gloss: 'to hesitate, defer to'   },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function HomeView() {
  const router = useRouter();
  const { user } = useAuth();
  const { addTab, openTabs } = useWorkspaceTabs();
  const { setPendingBookOpen } = useReaderState();

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
    (tab: WorkspaceTabKey) => {
      if (!openTabs.includes(tab)) addTab(tab);
      router.push('/workspace');
    },
    [addTab, openTabs, router],
  );

  const resumeBook = useCallback(
    (book: DeviceBookRecord) => {
      if (book.available) setPendingBookOpen(book.filename);
      if (!openTabs.includes('reader')) addTab('reader');
      router.push('/workspace');
    },
    [addTab, openTabs, router, setPendingBookOpen],
  );

  const currentlyReading = recent[0];
  const epigraphTitle = currentlyReading?.title ?? 'こゝろ';
  const epigraphAuthor = currentlyReading?.author ?? '夏目 漱石';

  return (
    <div className="h-full w-full overflow-auto lgc-scroll" style={{ background: 'var(--lgc-bg)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '52px 48px 140px' }}>

        {/* ── Opener ───────────────────────────────────────────── */}
        <OpenerLiterary
          title={epigraphTitle}
          author={epigraphAuthor}
          isResume={!!currentlyReading}
        />

        {/* ── What's in here — 4 destination cards ────────────── */}
        <section style={{ marginTop: 40 }}>
          <SectionLabel>What&apos;s in here</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {DESTINATIONS.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.k}
                  type="button"
                  onClick={() => goToDestination(d.tab)}
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
                        fontFamily: 'var(--font-display)',
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

        {/* ── Recently opened + Recent lookups ────────────────── */}
        <section style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 40 }}>
          <div>
            <SectionLabel>Recently opened</SectionLabel>
            {recent.length === 0 ? (
              <div
                className="rounded-lg border border-dashed border-lgc-border-strong px-5 py-8 text-[13px] text-lgc-fg-muted"
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
              onClick={() => goToDestination('dictionary')}
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

        {/* ── Getting around — onboarding cards ────────────────── */}
        <section style={{ marginTop: 56 }}>
          <SectionLabel>Getting around</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
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
            <OnboardingCard
              demo={<SplitDemo />}
              title="Drag a tab, work in two places"
              body="Hold a tab and drag to rearrange — or pull it next to another to split the view. Read and look up a word at the same time. Drag again to collapse back."
              demoPad="6px 0 14px"
            />
          </div>
        </section>

      </div>
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: 'var(--lgc-fg-muted)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 700,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function OnboardingCard({
  demo,
  title,
  body,
  demoPad,
}: {
  demo: React.ReactNode;
  title: string;
  body: React.ReactNode;
  demoPad: string;
}) {
  return (
    <div
      style={{
        padding: '22px 22px 26px',
        background: 'var(--lgc-bg-elev)',
        border: '1px solid var(--lgc-border)',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', padding: demoPad }}>{demo}</div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--lgc-fg-muted)', lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

function CoverMini({ title, color, w = 54, h = 78 }: { title: string; color: string; w?: number; h?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 50%, black) 100%)`,
        borderRadius: 3,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        boxShadow:
          '0 4px 10px rgba(0,0,0,0.16), inset 1px 0 0 rgba(255,255,255,0.08), inset -1px 0 0 rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 3,
          top: 5,
          right: 3,
          fontFamily: 'var(--font-display)',
          fontSize: 8.5,
          color: 'rgba(255,255,255,0.78)',
          lineHeight: 1.3,
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
        }}
      >
        {title}
      </div>
    </div>
  );
}

function DictEntry({ q }: { q: DictPlaceholder }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        padding: '7px 0',
        borderBottom: '1px solid var(--lgc-border)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--lgc-fg)', minWidth: 36 }}>
        {q.head}
      </span>
      <span style={{ fontSize: 10, color: 'var(--lgc-fg-muted)', fontFamily: 'var(--font-display)', minWidth: 50 }}>
        {q.reading}
      </span>
      <span
        style={{
          fontSize: 11,
          color: 'var(--lgc-fg)',
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {q.gloss}
      </span>
      {q.saved && <Star size={10} style={{ color: 'var(--lgc-accent)', flexShrink: 0 }} />}
    </div>
  );
}

// ── Opener ─────────────────────────────────────────────────────────────────

function OpenerLiterary({ title, author, isResume }: { title: string; author: string; isResume: boolean }) {
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
        Langeco · 語境
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

// ── Onboarding card 1 — bottom-nav illustration ────────────────────────────

function NavDemoCompact() {
  const items = [
    { I: Library,  dot: '#B5A27C' },
    { I: BookOpen, dot: '#D97757', active: true },
    { I: Search,   dot: '#4B7AA3', active: true },
    { I: Layers,   dot: '#8FB08A' },
  ];
  const plain = [
    { I: Home,     active: true },
    { I: User     },
    { I: Settings },
  ];
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.98)',
        border: '1px solid var(--lgc-border)',
        borderRadius: 14,
        boxShadow: '0 12px 32px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)',
        padding: 5,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {items.map((it, i) => {
          const Icon = it.I;
          return (
            <div
              key={i}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: it.active ? 'var(--lgc-bg-sunken)' : 'transparent',
                border: it.active ? `1px solid ${it.dot}55` : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: it.active ? 'var(--lgc-fg)' : 'var(--lgc-fg-muted)',
                position: 'relative',
              }}
            >
              <Icon size={15} />
              {it.active && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: -5,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: 99,
                    background: it.dot,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ width: 1, height: 22, background: 'var(--lgc-border)', margin: '0 3px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {plain.map((it, i) => {
          const Icon = it.I;
          return (
            <div
              key={i}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: it.active ? 'var(--lgc-bg-sunken)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: it.active ? 'var(--lgc-fg)' : 'var(--lgc-fg-subtle)',
              }}
            >
              <Icon size={13} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Onboarding card 2 — split-view + drag illustration ─────────────────────

function SplitDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Mini split-view sample */}
      <div
        style={{
          width: 280,
          height: 158,
          background: 'var(--lgc-bg-sunken)',
          border: '1px solid var(--lgc-border)',
          borderRadius: 10,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* Reader pane */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '58%',
            background: 'var(--lgc-bg)',
            borderRight: '1px solid var(--lgc-border)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <BookOpen size={9} style={{ color: '#D97757' }} />
            <span
              style={{
                fontSize: 8,
                color: 'var(--lgc-fg-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Reader
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 10,
              color: 'var(--lgc-fg)',
              lineHeight: 1.5,
            }}
          >
            私はその人の
            <span
              style={{
                background: 'color-mix(in oklab, #4B7AA3 30%, transparent)',
                padding: '0 2px',
                borderRadius: 2,
              }}
            >
              記憶
            </span>
            を呼び起すごとに、すぐ「先生」といいたくなる。
          </div>
          <div
            style={{
              fontSize: 7.5,
              color: 'var(--lgc-fg-subtle)',
              lineHeight: 1.4,
              fontStyle: 'italic',
            }}
          >
            Whenever I summon his memory…
          </div>
        </div>
        {/* Dictionary pane */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '42%',
            background: 'var(--lgc-bg-elev)',
            padding: '10px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Search size={9} style={{ color: '#4B7AA3' }} />
            <span
              style={{
                fontSize: 8,
                color: 'var(--lgc-fg-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Dictionary
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                color: 'var(--lgc-fg)',
                lineHeight: 1,
              }}
            >
              記憶
            </span>
            <span style={{ fontSize: 8, color: 'var(--lgc-fg-muted)', fontFamily: 'var(--font-display)' }}>
              きおく
            </span>
          </div>
          <div style={{ fontSize: 8.5, color: 'var(--lgc-fg)', lineHeight: 1.45 }}>memory; recollection</div>
          <div style={{ height: 1, background: 'var(--lgc-border)', margin: '3px 0' }} />
          <div style={{ fontSize: 7.5, color: 'var(--lgc-fg-muted)', lineHeight: 1.45 }}>
            記 record · 憶 remember
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
            <span
              style={{
                fontSize: 7,
                color: 'var(--lgc-fg-muted)',
                background: 'var(--lgc-bg-sunken)',
                padding: '1px 4px',
                borderRadius: 3,
                border: '1px solid var(--lgc-border)',
              }}
            >
              n
            </span>
            <span
              style={{
                fontSize: 7,
                color: 'var(--lgc-fg-muted)',
                background: 'var(--lgc-bg-sunken)',
                padding: '1px 4px',
                borderRadius: 3,
                border: '1px solid var(--lgc-border)',
              }}
            >
              vs
            </span>
          </div>
        </div>
        {/* Splitter handle */}
        <div
          style={{
            position: 'absolute',
            left: '58%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 4,
            height: 30,
            background: 'var(--lgc-fg-subtle)',
            opacity: 0.35,
            borderRadius: 99,
          }}
        />
      </div>

      {/* Hover-expanded bottom bar showing drag-state */}
      <div
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(22px) saturate(170%)',
          WebkitBackdropFilter: 'blur(22px) saturate(170%)',
          border: '1px solid var(--lgc-border)',
          borderRadius: 14,
          boxShadow: '0 14px 36px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.05)',
          padding: 5,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          position: 'relative',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[
            { I: BookOpen, dot: '#D97757', label: 'Reader',     active: true, order: 1 },
            { I: Search,   dot: '#4B7AA3', label: 'Dictionary', active: true, order: 2, dragging: true },
            { I: Library,  dot: '#B5A27C', label: 'Library' },
            { I: Layers,   dot: '#8FB08A', label: 'Decks' },
          ].map((it, i) => {
            const Icon = it.I;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 8px 5px 6px',
                  borderRadius: 9,
                  background: it.active ? 'var(--lgc-bg-sunken)' : 'transparent',
                  border: it.active ? `1px solid ${it.dot}55` : '1px solid transparent',
                  color: it.active ? 'var(--lgc-fg)' : 'var(--lgc-fg-muted)',
                  cursor: 'grab',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  opacity: it.dragging ? 0.45 : 1,
                  outline: it.dragging ? `1.5px dashed ${it.dot}` : 'none',
                  outlineOffset: 1,
                }}
              >
                <span
                  style={{
                    color: 'var(--lgc-fg-subtle)',
                    fontSize: 8,
                    letterSpacing: -1,
                    fontFamily: 'var(--font-mono)',
                    userSelect: 'none',
                  }}
                >
                  ⋮⋮
                </span>
                <Icon size={12} />
                <span style={{ fontSize: 10, fontWeight: it.active ? 600 : 500 }}>{it.label}</span>
                {it.active && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 99,
                      background: it.dot,
                    }}
                  />
                )}
                {it.active && (
                  <span
                    style={{
                      fontSize: 7.5,
                      padding: '0 3px',
                      borderRadius: 3,
                      background: 'var(--lgc-bg)',
                      border: '1px solid var(--lgc-border)',
                      color: 'var(--lgc-fg-subtle)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {it.order}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ width: 1, height: 22, background: 'var(--lgc-border)', margin: '0 3px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {[
            { I: Home, active: true },
            { I: User },
            { I: Settings },
          ].map((it, i) => {
            const Icon = it.I;
            return (
              <div
                key={i}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: it.active ? 'var(--lgc-bg-sunken)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: it.active ? 'var(--lgc-fg)' : 'var(--lgc-fg-subtle)',
                }}
              >
                <Icon size={12} />
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            top: -16,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 7.5,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--lgc-fg-subtle)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          click to toggle · drag to reorder
        </div>
      </div>
    </div>
  );
}
