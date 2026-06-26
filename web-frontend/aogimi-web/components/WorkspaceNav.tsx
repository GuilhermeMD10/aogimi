'use client';

import * as React from 'react';
import { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/icons';
import { BUBBLE_ITEMS, NAV_ITEMS, type BubbleKey } from './WorkspaceNav.types';

export type { BubbleKey } from './WorkspaceNav.types';

// ── Per-item brand colors ───────────────────────────────────────────────────

const ITEM_COLORS: Record<string, string> = {
  reader: '#D97757',
  dictionary: '#4B7AA3',
  cards: '#8FB08A',
  home: '#C78A4F',
  profile: '#B5A27C',
  settings: '#999999',
};

type WorkspaceNavProps = {
  activeBubble: BubbleKey | null;
  onToggleBubble: (key: BubbleKey) => void;
};

/**
 * Bottom workspace nav — translucent glass pill, soft tooltip, per-item brand
 * colors on icons + active dots. Owns the router/pathname state.
 */
export default function WorkspaceNav({ activeBubble, onToggleBubble }: WorkspaceNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const onNavClick = useCallback((path: string) => router.push(path), [router]);
  const onHomeClick = useCallback(() => router.push('/'), [router]);
  const isHomeActive = pathname === '/';

  return (
    <div
      className="fixed bottom-4.5 left-1/2 z-50 -translate-x-1/2"
      style={{ pointerEvents: 'none' }}
    >
      <nav
        className="flex items-center gap-0.5"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(22px) saturate(170%)',
          WebkitBackdropFilter: 'blur(22px) saturate(170%)',
          border: '1px solid var(--lgc-border)',
          borderRadius: 'var(--radius-2xl)',
          padding: 8,
          boxShadow: '0 18px 48px rgba(0,0,0,0.15)',
          pointerEvents: 'auto',
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            color={ITEM_COLORS[item.key]}
            active={pathname === item.path}
            activeDotOffset={-2}
            onClick={() => onNavClick(item.path)}
          />
        ))}

        <span
          aria-hidden
          style={{
            width: 1,
            alignSelf: 'stretch',
            background: 'var(--lgc-border)',
            margin: '4px 4px',
            flexShrink: 0,
          }}
        />

        <NavItem
          icon="home"
          label="Home"
          color={ITEM_COLORS.home}
          active={isHomeActive}
          activeDotOffset={-7}
          onClick={onHomeClick}
        />

        {BUBBLE_ITEMS.map((item) => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            color={ITEM_COLORS[item.key]}
            active={activeBubble === item.key}
            activeDotOffset={-7}
            onClick={() => onToggleBubble(item.key)}
          />
        ))}
      </nav>
    </div>
  );
}

function NavItem({
  icon,
  label,
  color,
  active,
  activeDotOffset,
  onClick,
}: {
  icon: IconName;
  label: string;
  color: string;
  active: boolean;
  activeDotOffset: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative flex h-11 w-11 items-center justify-center cursor-pointer rounded-lg transition-colors hover:bg-lgc-bg-sunken"
    >
      <Icon name={icon} size={20} style={{ color, flexShrink: 0 }} />
      {active && (
        <span
          aria-hidden
          className="absolute"
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: color,
            bottom: activeDotOffset,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      )}
      <Tooltip>{label}</Tooltip>
    </button>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none invisible absolute left-1/2 -translate-x-1/2 whitespace-nowrap group-hover:visible"
      style={{
        bottom: 'calc(100% + 8px)',
        zIndex: 60,
        background: 'var(--lgc-fg)',
        color: 'var(--lgc-bg)',
        padding: '4px 9px',
        borderRadius: 'var(--radius-md)',
        fontSize: 11,
        fontFamily: 'var(--lgc-font-ui)',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      }}
    >
      {children}
    </span>
  );
}
