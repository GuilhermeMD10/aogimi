'use client';

import { type ComponentType } from 'react';
import { CloudAlert, CloudDownload, Cloudy } from 'lucide-react';

// Visual badge for a book's sync state. Mirrors the mobile SyncPill:
// icon-only on a white pill with subtle shadow. Clicking it surfaces
// a short explanation of what the state means. Tokens live in
// `styles/sync-tokens.css`.

export type SyncPillState = 'synced' | 'unsynced' | 'toImport';

type IconProps = { size?: number; color?: string };

const CONFIG: Record<
  SyncPillState,
  { color: string; Icon: ComponentType<IconProps>; message: { title: string; body: string } }
> = {
  synced: {
    color: 'var(--sync-synced)',
    Icon: Cloudy,
    message: {
      title: 'Synced',
      body: "This book's progress is synced across devices.",
    },
  },
  unsynced: {
    color: 'var(--sync-unsynced)',
    Icon: CloudAlert,
    message: {
      title: 'Not synced',
      body: "This book's progress is only on this device. Sync it to make it available everywhere.",
    },
  },
  toImport: {
    color: 'var(--sync-import)',
    Icon: CloudDownload,
    message: {
      title: 'On your account',
      body: 'This book is on your account but not on this device. Open it to import the file here.',
    },
  },
};

export function SyncPill({ state }: { state: SyncPillState }) {
  const cfg = CONFIG[state];
  const Icon = cfg.Icon;
  const showInfo = () => window.alert(`${cfg.message.title}\n\n${cfg.message.body}`);
  return (
    // `<span role="button">` rather than a real `<button>`: the book
    // card already wraps its cover in a <button> to open the reader,
    // and a button-inside-a-button is invalid HTML (React hydration
    // throws). Span + role + keydown gives the same behaviour
    // (clickable, focusable, keyboard-activatable) without the
    // nesting violation.
    <span
      role="button"
      tabIndex={0}
      title={`${cfg.message.title} — ${cfg.message.body}`}
      aria-label={cfg.message.title}
      onClick={(e) => {
        // Don't let the click bubble to the surrounding tile/open handler.
        e.stopPropagation();
        e.preventDefault();
        showInfo();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          e.preventDefault();
          showInfo();
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
        borderRadius: 999,
        background: '#FFFFFF',
        border: '1.5px solid #FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        color: cfg.color,
        cursor: 'pointer',
        lineHeight: 0,
        userSelect: 'none',
      }}
    >
      <Icon size={18} color={cfg.color} />
    </span>
  );
}
