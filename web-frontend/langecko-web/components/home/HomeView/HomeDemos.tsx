'use client';

// Theme-agnostic helpers shared between default and stamp HomeView variants.

import { Fragment, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Search,
  Layers,
  Star,
  Home,
  User,
  Settings,
  X,
} from 'lucide-react';
import {
  WORKSPACE_TAB_META,
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

