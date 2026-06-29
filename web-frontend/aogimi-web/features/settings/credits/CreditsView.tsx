'use client';

import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react';
import { CREDITS, type CreditEntry, type CreditSection } from './credits';

// Credits view — third-party attributions. Back navigation is delegated
// to the parent: the route page passes router.back; the bubble passes a
// handler that swaps back to the settings list inside the bubble.

export type CreditsViewProps = {
  onBack: () => void;
};

export default function CreditsView({ onBack }: CreditsViewProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-6 pb-16">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 mb-4 text-sm transition-opacity hover:opacity-70"
        style={{ color: 'var(--lgc-fg-muted)' }}
      >
        <ChevronLeft size={18} />
        Back
      </button>

      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--lgc-fg)' }}>
        Credits
      </h1>

      <div className="flex flex-col gap-8">
        {CREDITS.map((section) => (
          <Section key={section.heading} section={section} />
        ))}
      </div>
    </div>
  );
}

function Section({ section }: { section: CreditSection }) {
  // Pinned sections render always-open with no toggle. Everything else is
  // a collapsible — title-only by default, body revealed on click.
  const [open, setOpen] = useState(false);
  const expanded = section.pinned || open;

  const heading = (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold" style={{ color: 'var(--lgc-fg)' }}>
        {section.heading}
      </h2>
      {!section.pinned && (
        <span style={{ color: 'var(--lgc-fg-muted)' }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      )}
    </div>
  );

  return (
    <section className="flex flex-col gap-2">
      {section.pinned ? (
        heading
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full text-left transition-opacity hover:opacity-70 active:opacity-60"
        >
          {heading}
        </button>
      )}

      {expanded && (
        <>
          {section.blurb && (
            <p className="text-sm leading-snug" style={{ color: 'var(--lgc-fg-muted)' }}>
              {section.blurb}
            </p>
          )}
          <ul
            className="mt-1"
            style={{
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: 'var(--lgc-border)',
              borderStyle: 'solid',
            }}
          >
            {section.entries.map((entry, i) => (
              <Entry
                key={entry.name}
                entry={entry}
                isLast={i === section.entries.length - 1}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Entry({ entry, isLast }: { entry: CreditEntry; isLast: boolean }) {
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium" style={{ color: 'var(--lgc-fg)' }}>
          {entry.name}
        </div>
        {entry.owner && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--lgc-fg-muted)' }}>
            {entry.owner}
          </div>
        )}
        {entry.note && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--lgc-fg-muted)' }}>
            {entry.note}
          </div>
        )}
      </div>
      <div
        className="text-xs tracking-wide font-mono"
        style={{ color: 'var(--lgc-fg-muted)' }}
      >
        {entry.license}
      </div>
    </>
  );

  const rowStyle = {
    borderBottomWidth: isLast ? 0 : 1,
    borderColor: 'var(--lgc-border)',
    borderStyle: 'solid' as const,
    padding: '12px 14px',
  };

  return (
    <li>
      {entry.url ? (
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 transition-opacity hover:opacity-70"
          style={rowStyle}
        >
          {inner}
        </a>
      ) : (
        <div className="flex items-center gap-3" style={rowStyle}>
          {inner}
        </div>
      )}
    </li>
  );
}
