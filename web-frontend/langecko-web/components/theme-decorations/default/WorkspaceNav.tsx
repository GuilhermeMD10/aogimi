'use client';

import * as React from 'react';
import { Icon, type IconName } from '@/components/icons';
import {
  BUBBLE_ITEMS,
  WORKSPACE_ITEMS,
  type WorkspaceNavVariantProps,
} from '@/components/WorkspaceNav.types';
import { WORKSPACE_TAB_META } from '@/lib/config/tab-config';

// ── Per-item brand colors (default theme only) ──────────────────────────────

const ITEM_COLORS: Record<string, string> = {
  reader: '#D97757',
  dictionary: '#4B7AA3',
  cards: '#8FB08A',
  home: '#C78A4F',
  profile: '#B5A27C',
  settings: '#999999',
};

/**
 * Default variant — translucent glass pill, soft tooltip, per-item brand
 * colors on icons + active dots.
 */
export function DefaultWorkspaceNav({
  activeBubble,
  onToggleBubble,
  openTabs,
  onTabClick,
  onHomeClick,
  isHomeActive,
  pathname,
}: WorkspaceNavVariantProps) {
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
          borderRadius: 16,
          padding: 8,
          boxShadow: '0 18px 48px rgba(0,0,0,0.15)',
          pointerEvents: 'auto',
        }}
      >
        {WORKSPACE_ITEMS.map((item) => {
          const isActive = openTabs.includes(item.key) && pathname === '/workspace';
          const meta = WORKSPACE_TAB_META[item.key];
          return (
            <DefaultNavItem
              key={item.key}
              icon={item.icon}
              label={meta.label}
              color={ITEM_COLORS[item.key]}
              active={isActive}
              activeDotOffset={-2}
              onClick={() => onTabClick(item.key)}
            />
          );
        })}

        <span
          aria-hidden
          style={{
            width: 1,
            height: 26,
            background: 'var(--lgc-border)',
            margin: '0 4px',
            flexShrink: 0,
          }}
        />

        <DefaultNavItem
          icon="home"
          label="Home"
          color={ITEM_COLORS.home}
          active={isHomeActive}
          activeDotOffset={-7}
          onClick={onHomeClick}
        />

        {BUBBLE_ITEMS.map((item) => {
          const isActive = activeBubble === item.key;
          return (
            <DefaultNavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              color={ITEM_COLORS[item.key]}
              active={isActive}
              activeDotOffset={-7}
              onClick={() => onToggleBubble(item.key)}
            />
          );
        })}
      </nav>
    </div>
  );
}

function DefaultNavItem({
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
      className="group relative flex h-8 w-8 items-center justify-center cursor-pointer rounded-lg transition-colors hover:bg-lgc-bg-sunken"
    >
      <Icon name={icon} size={16} style={{ color, flexShrink: 0 }} />
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
      <DefaultTooltip>{label}</DefaultTooltip>
    </button>
  );
}

function DefaultTooltip({ children }: { children: React.ReactNode }) {
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
        borderRadius: 6,
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
