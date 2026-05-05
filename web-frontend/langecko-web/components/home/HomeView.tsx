'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Search,
  Layers,
  ChevronRight,
  Star,
  Home,
  User,
  Settings,
  Plus,
  Columns3,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import { useWorkspaceTabs } from '@/components/providers/WorkspaceTabsProvider';
import { useBubble } from '@/components/providers/BubbleProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { StampMark } from '@/components/theme-decorations/stamp/StampMark';
import { getDeviceBooks, type DeviceBookRecord } from '@/lib/devicesApi';
import { getDeviceId } from '@/lib/deviceId';
import {
  WORKSPACE_TAB_META,
  WORKSPACE_TAB_ORDER,
  type WorkspaceTabKey,
} from '@/lib/config/tab-config';
import type { BubbleKey } from '@/components/WorkspaceNav';

// ── Destination cards ──────────────────────────────────────────────────────

type Destination = {
  k: 'reader' | 'dict' | 'decks' | 'profile';
  /** Either opens a workspace tab… */
  tab?: WorkspaceTabKey;
  /** …or pops a bubble (mutually exclusive with `tab`). */
  bubble?: BubbleKey;
  icon: LucideIcon;
  label: string;
  dot: string;
  desc: string;
};

const DESTINATIONS: Destination[] = [
  { k: 'reader',  tab: 'reader',     icon: BookOpen, label: 'Reader',     dot: '#D97757', desc: 'Read with tap-to-look-up and inline context.' },
  { k: 'dict',    tab: 'dictionary', icon: Search,   label: 'Dictionary', dot: '#4B7AA3', desc: 'Full JMdict entries, kanji breakdown, audio.'  },
  { k: 'decks',   tab: 'cards',      icon: Layers,   label: 'Decks',      dot: '#8FB08A', desc: 'Flashcards built from what you read.'         },
  { k: 'profile', bubble: 'profile', icon: User,     label: 'Profile',    dot: '#B5A27C', desc: 'Account, themes, and reading history.'        },
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
  const { setActiveBubble } = useBubble();
  const { theme } = useTheme();
  const isStamp = theme === 'stamp';

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
      if (d.tab) {
        if (!openTabs.includes(d.tab)) addTab(d.tab);
        router.push('/workspace');
      }
    },
    [addTab, openTabs, router, setActiveBubble],
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
          isStamp={isStamp}
        />

        {/* ── What's in here — 4 destination cards ────────────── */}
        <section style={{ marginTop: 40 }}>
          <SectionLabel isStamp={isStamp}>What&apos;s in here</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isStamp ? 18 : 12 }}>
            {DESTINATIONS.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.k}
                  type="button"
                  onClick={() => goToDestination(d)}
                  className={isStamp ? 'lgc-card lgc-pressable text-left' : 'text-left transition-colors hover:bg-lgc-bg-sunken/40'}
                  style={{
                    background: isStamp ? undefined : 'var(--lgc-bg-elev)',
                    border: isStamp ? undefined : '1px solid var(--lgc-border)',
                    borderRadius: isStamp ? undefined : 14,
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
                        borderRadius: isStamp ? 0 : 10,
                        border: isStamp ? '1px solid var(--lgc-fg)' : undefined,
                        background: isStamp ? d.dot : `color-mix(in oklab, ${d.dot} 14%, transparent)`,
                        color: isStamp ? 'var(--lgc-bg)' : d.dot,
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
                        fontWeight: isStamp ? 600 : 500,
                        letterSpacing: isStamp ? '0.02em' : '-0.01em',
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
            <SectionLabel isStamp={isStamp}>Recently opened</SectionLabel>
            {recent.length === 0 ? (
              <div
                className="border border-dashed border-lgc-border-strong px-5 py-8 text-[13px] text-lgc-fg-muted"
                style={{ borderRadius: isStamp ? 0 : 8 }}
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
                      borderRadius: isStamp ? 0 : (i === 0 ? 12 : 0),
                      boxShadow: isStamp && i === 0 ? '3px 3px 0 var(--lgc-fg)' : undefined,
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
            <SectionLabel isStamp={isStamp}>Recent lookups</SectionLabel>
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
              onClick={() => {
                if (!openTabs.includes('dictionary')) addTab('dictionary');
                router.push('/workspace');
              }}
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
          <SectionLabel isStamp={isStamp}>Getting around</SectionLabel>
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

function SectionLabel({ children, isStamp }: { children: React.ReactNode; isStamp?: boolean }) {
  return (
    <div
      style={{
        fontFamily: isStamp ? 'var(--lgc-font-mono)' : undefined,
        fontSize: 11,
        color: isStamp ? 'var(--lgc-accent)' : 'var(--lgc-fg-muted)',
        letterSpacing: isStamp ? '0.22em' : '0.18em',
        textTransform: 'uppercase',
        fontWeight: isStamp ? 500 : 700,
        marginBottom: 14,
        display: isStamp ? 'flex' : undefined,
        alignItems: isStamp ? 'center' : undefined,
        gap: isStamp ? 12 : undefined,
      }}
    >
      <span>{children}</span>
      {isStamp && (
        <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--lgc-fg-subtle)', opacity: 0.5 }} />
      )}
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

function OpenerLiterary({
  title,
  author,
  isResume,
  isStamp,
}: {
  title: string;
  author: string;
  isResume: boolean;
  isStamp: boolean;
}) {
  const epigraph = useMemo(
    () => '「私はその人の記憶を呼び起すごとに、すぐ『先生』といいたくなる。」',
    [],
  );

  if (isStamp) return <OpenerStamp title={title} author={author} isResume={isResume} />;

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

// ── Opener (Stamp variant) — postage masthead ─────────────────────────────

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
        {/* Vertical kanji label */}
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

        {/* Big serif h1 */}
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

        {/* Lede */}
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

        {/* Mono meta strip */}
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

      {/* Stamp mark in the corner */}
      <StampMark size={96} rotate={-6}>語</StampMark>
    </div>
  );
}

// ── Onboarding card 1 — bottom-nav illustration ────────────────────────────

function NavDemoCompact() {
  const items = [
    { I: BookOpen, dot: '#D97757', active: true },
    { I: Search,   dot: '#4B7AA3', active: true },
    { I: Layers,   dot: '#8FB08A' },
    { I: User,     dot: '#B5A27C' },
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

// ── Onboarding card 2 — split-view + workspace tab-bar illustration ────────

function SplitDemo() {
  // Local-only demo state — drag/add/close are wired up but don't affect the real workspace.
  const [demoTabs, setDemoTabs] = useState<WorkspaceTabKey[]>(['reader', 'dictionary']);
  const [draggedTab, setDraggedTab] = useState<WorkspaceTabKey | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const tabsAvailableToAdd = useMemo(
    () => WORKSPACE_TAB_ORDER.filter((t) => !demoTabs.includes(t)),
    [demoTabs],
  );

  const closeTab = (key: WorkspaceTabKey) => {
    setDemoTabs((prev) => prev.filter((t) => t !== key));
  };

  const addTab = (key: WorkspaceTabKey) => {
    setDemoTabs((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const handleDropAtIndex = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    if (!draggedTab) return;
    const targetIndex = index ?? dropIndex;
    if (targetIndex == null) return;
    setDemoTabs((prev) => {
      const fromIdx = prev.indexOf(draggedTab);
      if (fromIdx === -1) return prev;
      const without = prev.filter((t) => t !== draggedTab);
      const adjusted = fromIdx < targetIndex ? targetIndex - 1 : targetIndex;
      const next = [...without];
      next.splice(adjusted, 0, draggedTab);
      return next;
    });
    setDraggedTab(null);
    setDropIndex(null);
  };

  const clearDrag = () => {
    setDraggedTab(null);
    setDropIndex(null);
  };

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [pickerOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
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

      {/* Static replica of the workspace pane bar — drag/add/close are wired locally */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 460 }}>
        <div
          style={{
            position: 'absolute',
            top: -14,
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
          drag to reorder · + to add
        </div>
        <div
          className="lgc-panebar"
          style={{
            padding: '8px 12px',
            borderRadius: 12,
            border: '1px solid var(--lgc-border)',
            borderBottom: '1px solid var(--lgc-border)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
            fontFamily: 'var(--font-ui)',
            minHeight: 44,
            flexWrap: 'wrap',
          }}
          onDragOver={(e) => {
            if (draggedTab) e.preventDefault();
          }}
          onDrop={clearDrag}
        >
          <span
            className="select-none text-[10px] font-semibold uppercase tracking-widest text-lgc-fg-muted"
            style={{ marginRight: 4 }}
          >
            Panes
          </span>

          {demoTabs.map((tabKey, index) => {
            const meta = WORKSPACE_TAB_META[tabKey];
            const Icon = meta.icon;
            const isDragged = draggedTab === tabKey;

            return (
              <Fragment key={tabKey}>
                {index > 0 && <span className="lgc-panearrow">⇄</span>}

                <div
                  className="relative flex h-8 w-1 items-center justify-center"
                  onDragOver={(e) => {
                    if (!draggedTab) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDropIndex(index);
                  }}
                  onDrop={(e) => handleDropAtIndex(e, index)}
                >
                  {dropIndex === index && (
                    <span className="pointer-events-none absolute h-6 w-0.5 rounded-full bg-lgc-accent" />
                  )}
                </div>

                <div
                  draggable
                  onDragStart={(e) => {
                    setDraggedTab(tabKey);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', tabKey);
                  }}
                  onDragOver={(e) => {
                    if (!draggedTab) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropIndex(e.clientX < rect.left + rect.width / 2 ? index : index + 1);
                  }}
                  onDrop={(e) => handleDropAtIndex(e)}
                  onDragEnd={clearDrag}
                  className={`lgc-panechip ${isDragged ? 'lgc-panechip-ghost' : ''}`}
                >
                  <span className="lgc-panechip-dot" style={{ background: meta.dot }} />
                  <Icon size={12} className="text-lgc-fg-muted" />
                  <span className="text-[12px] font-medium">{meta.label}</span>
                  <button
                    type="button"
                    onClick={() => closeTab(tabKey)}
                    draggable={false}
                    className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-lgc-fg-subtle transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
                    aria-label={`Close ${meta.label}`}
                  >
                    <X size={9} />
                  </button>
                </div>
              </Fragment>
            );
          })}

          <div
            className="relative flex h-8 w-1 items-center justify-center"
            onDragOver={(e) => {
              if (!draggedTab) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropIndex(demoTabs.length);
            }}
            onDrop={(e) => handleDropAtIndex(e, demoTabs.length)}
          >
            {dropIndex === demoTabs.length && (
              <span className="pointer-events-none absolute h-6 w-0.5 rounded-full bg-lgc-accent" />
            )}
          </div>

          <div ref={pickerRef} className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              disabled={tabsAvailableToAdd.length === 0}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={11} /> Add pane
            </button>

            {pickerOpen && tabsAvailableToAdd.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-1.5 min-w-40 overflow-hidden rounded-lg border border-lgc-border-strong bg-lgc-bg-elev py-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]">
                {tabsAvailableToAdd.map((key) => {
                  const m = WORKSPACE_TAB_META[key];
                  const TabIcon = m.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        addTab(key);
                        setPickerOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-lgc-fg transition-colors hover:bg-lgc-bg-sunken"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: m.dot }} />
                      <TabIcon size={12} className="text-lgc-fg-muted" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="ml-auto flex gap-1">
            <button
              type="button"
              disabled
              className="flex h-7 w-7 items-center justify-center rounded-md text-lgc-fg-subtle opacity-40"
              title="Layouts"
            >
              <Columns3 size={13} />
            </button>
            <button
              type="button"
              disabled
              className="flex h-7 w-7 items-center justify-center rounded-md text-lgc-fg-subtle opacity-40"
              title="Save workspace"
            >
              <Star size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
