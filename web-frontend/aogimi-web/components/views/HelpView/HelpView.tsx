'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Cloudy,
  CloudAlert,
  CloudDownload,
} from 'lucide-react';

// Help — explains what the app is and the bits that aren't obvious from
// poking around (sync states in particular). Prose-heavy; this is the
// page someone reads ONCE.

const SYNC_GREEN = '#2E9F58';
const SYNC_BLUE = '#1E3D6B';
const SYNC_GREY = '#6B6661';

export type HelpViewProps = {
  onBack: () => void;
};

export default function HelpView({ onBack }: HelpViewProps) {
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
        Help
      </h1>

      <div className="flex flex-col gap-8">
        <Section heading="What is Aogimi?" pinned>
          <P>
            Aogimi is a Japanese reading and vocabulary companion. Open
            an EPUB or PDF, look up any word in the built-in dictionary
            with a single gesture, save what you want to remember to a
            flashcard deck, and pick up where you left off on any of
            your devices.
          </P>
        </Section>

        <Section heading="Reading a book">
          <P>
            Click a book on the home screen to open it. The reader
            supports reflowable EPUBs (novels, light novels) and PDFs.
          </P>
          <P>
            To look up a word, select it with your cursor (or finger on
            touch). A small action bar appears with shortcuts for
            Dictionary, Card, DeepL, Highlight, and Copy.
          </P>
          <P>
            The bottom dock has chapter navigation, bookmarks, and
            typography settings. Click the workspace nav at the bottom
            to leave the reader.
          </P>
        </Section>

        <Section heading="Dictionary">
          <P>
            Word entries come from JMdict, kanji info from KANJIDIC2,
            names from JMnedict, and example sentences and pitch
            accents from the Kanjium project. Use the Dictionary tab
            to search at any time, or click Dict from a selection
            inside the reader.
          </P>
        </Section>

        <Section heading="Flashcard decks">
          <P>
            Decks live in the Decks tab. Add a card from any text
            selection via Card. Each card stays linked to its
            dictionary entry so the reading and meaning stay in sync if
            the entry changes upstream.
          </P>
        </Section>

        <Section heading="How sync works">
          <P>
            Your books, highlights, bookmarks, and reading positions are
            saved to your account. Each device keeps a local copy and
            pushes changes to the backend opportunistically when it's
            online. If you import a book while offline, it stays on this
            device — marked as unsynced — until the next sync round.
          </P>
          <P>
            The cloud badge in the corner of each book tile tells you
            where that book stands:
          </P>

          <ul
            className="mt-2"
            style={{
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: 'var(--lgc-border)',
              borderStyle: 'solid',
            }}
          >
            <LegendRow
              icon={<Cloudy size={22} color={SYNC_GREEN} />}
              title="Synced"
              body="This book and its reading state are saved to your account. Any progress you make here will appear on your other devices."
            />
            <LegendRow
              icon={<CloudAlert size={22} color={SYNC_BLUE} />}
              title="Not synced"
              body="Local-only. Either you imported the book offline, or a recent reading-state write didn't make it to the backend yet. Use Sync now to push it."
            />
            <LegendRow
              icon={<CloudDownload size={22} color={SYNC_GREY} />}
              title="On your account"
              isLast
              body="The book is in your library from another device, but the file isn't on this one yet. Click it to import the file from your device storage."
            />
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({
  heading,
  children,
  pinned,
}: {
  heading: string;
  children: React.ReactNode;
  /** When true, render always-expanded with no toggle. Used for the
   *  orientation section ("What is Aogimi?") that should never hide. */
  pinned?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const expanded = pinned || open;

  const headingRow = (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold" style={{ color: 'var(--lgc-fg)' }}>
        {heading}
      </h2>
      {!pinned && (
        <span style={{ color: 'var(--lgc-fg-muted)' }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      )}
    </div>
  );

  return (
    <section className="flex flex-col gap-2">
      {pinned ? (
        headingRow
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full text-left transition-opacity hover:opacity-70 active:opacity-60"
        >
          {headingRow}
        </button>
      )}
      {expanded && children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-snug" style={{ color: 'var(--lgc-fg-muted)' }}>
      {children}
    </p>
  );
}

function LegendRow({
  icon,
  title,
  body,
  isLast,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  isLast?: boolean;
}) {
  return (
    <li
      className="flex gap-3"
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderColor: 'var(--lgc-border)',
        borderStyle: 'solid',
        padding: '12px 14px',
      }}
    >
      <div className="pt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold" style={{ color: 'var(--lgc-fg)' }}>
          {title}
        </div>
        <div className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--lgc-fg-muted)' }}>
          {body}
        </div>
      </div>
    </li>
  );
}
