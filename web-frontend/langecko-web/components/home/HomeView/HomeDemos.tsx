'use client';

// Theme-agnostic helpers shared between default and stamp HomeView variants.

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Search,
  Layers,
  Star,
  Home,
  User,
  Settings,
  Plus,
  Columns3,
  X,
} from 'lucide-react';
import {
  WORKSPACE_TAB_META,
  WORKSPACE_TAB_ORDER,
  type WorkspaceTabKey,
} from '@/lib/config/tab-config';

export type DictPlaceholder = { head: string; reading: string; gloss: string; saved?: boolean };

export const RECENT_LOOKUPS: DictPlaceholder[] = [
  { head: '鎌倉',   reading: 'かまくら',   gloss: 'Kamakura (city)',         saved: true  },
  { head: '書生',   reading: 'しょせい',   gloss: 'student (old-fashioned)' },
  { head: '記憶',   reading: 'きおく',     gloss: 'memory; recollection',   saved: true  },
  { head: '暑中',   reading: 'しょちゅう', gloss: 'mid-summer'              },
  { head: '憚かる', reading: 'はばかる',   gloss: 'to hesitate, defer to'   },
];

export function CoverMini({ title, color, w = 54, h = 78 }: { title: string; color: string; w?: number; h?: number }) {
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

export function DictEntry({ q }: { q: DictPlaceholder }) {
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

export function OnboardingCard({
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

export function NavDemoCompact() {
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

export function SplitDemo() {
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
