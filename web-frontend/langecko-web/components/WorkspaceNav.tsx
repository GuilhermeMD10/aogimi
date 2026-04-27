'use client';

import { useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BookOpen, Search, Layers, User, Home, Settings } from 'lucide-react';
import { WORKSPACE_TAB_META, type WorkspaceTabKey } from '@/lib/config/tab-config';
import { useWorkspaceTabs } from '@/components/providers/WorkspaceTabsProvider';

// ── Item colors from design handoff ─────────────────────────────────────────

const ITEM_COLORS: Record<string, string> = {
  reader: '#D97757',
  dictionary: '#4B7AA3',
  cards: '#8FB08A',
  home: '#C78A4F',
  profile: '#B5A27C',
  settings: '#999999',
};

// ── Workspace toggle buttons (left side) ────────────────────────────────────

const WORKSPACE_ITEMS: { key: WorkspaceTabKey; icon: typeof BookOpen }[] = [
  { key: 'reader', icon: BookOpen },
  { key: 'dictionary', icon: Search },
  { key: 'cards', icon: Layers },
];

// ── Bubble buttons (right side) ─────────────────────────────────────────────

export type BubbleKey = 'profile' | 'settings';

const BUBBLE_ITEMS: { key: BubbleKey; icon: typeof Home; label: string }[] = [
  { key: 'profile', icon: User, label: 'Profile' },
  { key: 'settings', icon: Settings, label: 'Settings' },
];

type WorkspaceNavProps = {
  activeBubble: BubbleKey | null;
  onToggleBubble: (key: BubbleKey) => void;
};

export default function WorkspaceNav({ activeBubble, onToggleBubble }: WorkspaceNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { openTabs, toggleTab, addTab } = useWorkspaceTabs();

  const [navHovered, setNavHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const onTabClick = useCallback(
    (tab: WorkspaceTabKey) => {
      if (pathname !== '/workspace') {
        // Always end up on /workspace with that tab open
        if (!openTabs.includes(tab)) addTab(tab);
        router.push('/workspace');
        return;
      }
      toggleTab(tab);
    },
    [pathname, openTabs, addTab, toggleTab, router],
  );

  const onHomeClick = useCallback(() => {
    router.push('/');
  }, [router]);

  const isHomeActive = pathname === '/';

  return (
    <div className="fixed bottom-4.5 left-1/2 z-50 -translate-x-1/2" style={{ pointerEvents: 'none' }}>
      <nav
        className="flex items-center"
        onMouseEnter={() => setNavHovered(true)}
        onMouseLeave={() => {
          setNavHovered(false);
          setHoveredItem(null);
        }}
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(22px) saturate(170%)',
          WebkitBackdropFilter: 'blur(22px) saturate(170%)',
          border: '1px solid var(--lgc-border)',
          borderRadius: 16,
          padding: 10,
          boxShadow: '0 18px 48px rgba(0,0,0,0.15)',
          pointerEvents: 'auto',
        }}
      >
        {/* ── Left: workspace toggle buttons ─────────────────────────── */}
        {WORKSPACE_ITEMS.map((item) => {
          const isActive = openTabs.includes(item.key) && pathname === '/workspace';
          const isBtnHovered = hoveredItem === item.key;
          const color = ITEM_COLORS[item.key];
          const meta = WORKSPACE_TAB_META[item.key];
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onTabClick(item.key)}
              onMouseEnter={() => setHoveredItem(item.key)}
              onMouseLeave={() => setHoveredItem(null)}
              className="relative flex items-center justify-center cursor-pointer"
              style={{
                height: 32,
                minWidth: 32,
                borderRadius: 10,
                background: isBtnHovered && navHovered ? 'var(--lgc-bg-sunken)' : 'transparent',
                padding: navHovered ? '0 10px' : '0 8px',
                gap: navHovered ? 6 : 0,
                transition: 'background 150ms, padding 400ms ease, gap 400ms ease',
              }}
              aria-label={meta.label}
            >
              <Icon size={16} style={{ color, flexShrink: 0 }} />
              <span
                style={{
                  maxWidth: navHovered ? 80 : 0,
                  opacity: navHovered ? 1 : 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: 'var(--lgc-fg)',
                  transition: 'max-width 400ms ease, opacity 400ms ease',
                }}
              >
                {meta.label}
              </span>
              {isActive && (
                <span
                  className="absolute"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: color,
                    bottom: -2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                />
              )}
            </button>
          );
        })}

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div
          style={{
            width: 1,
            height: 26,
            background: 'var(--lgc-border)',
            margin: '0 4px',
            flexShrink: 0,
          }}
        />

        {/* ── Right: home (route) + bubbles ──────────────────────────── */}
        <button
          type="button"
          onClick={onHomeClick}
          onMouseEnter={() => setHoveredItem('home')}
          onMouseLeave={() => setHoveredItem(null)}
          className="relative flex items-center justify-center cursor-pointer"
          style={{
            height: 32,
            minWidth: 32,
            borderRadius: 10,
            background: hoveredItem === 'home' && navHovered ? 'var(--lgc-bg-sunken)' : 'transparent',
            padding: navHovered ? '0 10px' : '0 8px',
            gap: navHovered ? 6 : 0,
            transition: 'background 150ms, padding 500ms ease, gap 500ms ease',
          }}
          aria-label="Home"
        >
          <Home size={16} style={{ color: ITEM_COLORS.home, flexShrink: 0 }} />
          <span
            style={{
              maxWidth: navHovered ? 80 : 0,
              opacity: navHovered ? 1 : 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              fontSize: 11.5,
              fontWeight: 500,
              color: 'var(--lgc-fg)',
              transition: 'max-width 500ms ease, opacity 500ms ease',
            }}
          >
            Home
          </span>
          {isHomeActive && (
            <span
              className="absolute"
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: ITEM_COLORS.home,
                bottom: -7,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />
          )}
        </button>

        {BUBBLE_ITEMS.map((item) => {
          const isActive = activeBubble === item.key;
          const isBtnHovered = hoveredItem === item.key;
          const color = ITEM_COLORS[item.key];
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggleBubble(item.key)}
              onMouseEnter={() => setHoveredItem(item.key)}
              onMouseLeave={() => setHoveredItem(null)}
              className="relative flex items-center justify-center cursor-pointer"
              style={{
                height: 32,
                minWidth: 32,
                borderRadius: 10,
                background: isBtnHovered && navHovered ? 'var(--lgc-bg-sunken)' : 'transparent',
                padding: navHovered ? '0 10px' : '0 8px',
                gap: navHovered ? 6 : 0,
                transition: 'background 150ms, padding 500ms ease, gap 500ms ease',
              }}
              aria-label={item.label}
            >
              <Icon size={16} style={{ color, flexShrink: 0 }} />
              <span
                style={{
                  maxWidth: navHovered ? 80 : 0,
                  opacity: navHovered ? 1 : 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: 'var(--lgc-fg)',
                  transition: 'max-width 500ms ease, opacity 500ms ease',
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <span
                  className="absolute"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: color,
                    bottom: -7,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
