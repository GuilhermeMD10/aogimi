'use client';

import * as React from 'react';
import { Icon, type IconName } from '@/components/icons';
import {
  BUBBLE_ITEMS,
  NAV_ITEMS,
  type WorkspaceNavVariantProps,
} from '@/components/WorkspaceNav.types';

/**
 * Stamp variant — square paper pill, sumi border + 3px hard offset shadow,
 * 44×44 square items, vermillion active state with paper-color icon.
 */
export function StampWorkspaceNav({
  activeBubble,
  onToggleBubble,
  onNavClick,
  onHomeClick,
  isHomeActive,
  pathname,
}: WorkspaceNavVariantProps) {
  return (
    <div
      className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2"
      style={{ pointerEvents: 'none' }}
    >
      <nav
        className="flex items-center"
        style={{
          background: 'var(--lgc-bg)',
          border: '1px solid var(--lgc-fg)',
          padding: 6,
          gap: 6,
          boxShadow: '3px 3px 0 var(--lgc-fg)',
          pointerEvents: 'auto',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <StampNavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={isActive}
              onClick={() => onNavClick(item.path)}
            />
          );
        })}

        <span
          aria-hidden
          style={{
            width: 1,
            alignSelf: 'stretch',
            background: 'var(--lgc-fg-subtle)',
            margin: '4px 4px',
            flexShrink: 0,
            opacity: 0.5,
          }}
        />

        <StampNavItem
          icon="home"
          label="Home"
          active={isHomeActive}
          onClick={onHomeClick}
        />

        {BUBBLE_ITEMS.map((item) => {
          const isActive = activeBubble === item.key;
          return (
            <StampNavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={isActive}
              onClick={() => onToggleBubble(item.key)}
            />
          );
        })}
      </nav>
    </div>
  );
}

function StampNavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative flex h-11 w-11 items-center justify-center cursor-pointer transition-colors"
      style={{
        background: active ? 'var(--lgc-accent)' : 'transparent',
        color: active ? 'var(--lgc-accent-fg)' : 'var(--lgc-fg-muted)',
        border: active
          ? '1px solid var(--lgc-error)'
          : '1px solid transparent',
      }}
    >
      <Icon name={icon} size={20} strokeWidth={1.7} style={{ flexShrink: 0 }} />
      {active && (
        <span
          aria-hidden
          className="absolute"
          style={{
            bottom: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            background: 'var(--lgc-accent-fg)',
            borderRadius: '50%',
          }}
        />
      )}
      <StampTooltip>{label}</StampTooltip>
    </button>
  );
}

function StampTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none invisible absolute left-1/2 -translate-x-1/2 whitespace-nowrap group-hover:visible"
      style={{
        bottom: 'calc(100% + 8px)',
        zIndex: 60,
        background: 'var(--lgc-bg)',
        color: 'var(--lgc-fg)',
        border: '1.5px solid var(--lgc-fg)',
        boxShadow: '2px 2px 0 var(--lgc-fg)',
        padding: '4px 10px',
        fontSize: 12,
        fontFamily: 'var(--lgc-font-display)',
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  );
}
