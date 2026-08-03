'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';

import { MAX_DECK_NAME, deckQuotaMessage } from '../lib/limits';
import { NIGHT } from '../lib/nightChrome';

/**
 * The suspended chrome over the sky: the brand mark top-left, the actions
 * top-right. What the actions are depends on the tier —
 *
 *   outer sky:    "Study N due" (all decks) + "New deck" (opens the create
 *                 form as a glass popover; the reader-bubble flow shares the
 *                 same provider mutation).
 *   focused deck: "Study N due" (deck-scoped) + the delete-deck icon button
 *                 (danger outline; the page confirms before deleting).
 *
 * The handover's "⋯" overflow menu is deliberately not built: its items
 * (import a deck, manage decks, sky settings) don't exist as features.
 */

const MONO_LABEL = 'font-[family-name:var(--face-mono)]';

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/** 42px glass square — the icon buttons' shared shell. */
const SQUARE = `flex size-[42px] items-center justify-center rounded-[11px] ${FOCUS_RING}`;

function PlayGlyph() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4.5l13 7.5-13 7.5z" />
    </svg>
  );
}

/** The gold primary — "Study N due", or "Study ahead" when nothing is. */
function StudyButton({ due, href }: { due: number | null; href: string }) {
  const hasDue = due !== null && due > 0;
  return (
    <Link
      href={hasDue ? href : '/study'}
      className={`inline-flex items-center gap-[9px] rounded-[11px] px-[18px] py-[11px] text-[13.5px] leading-none font-bold whitespace-nowrap transition-transform duration-[180ms] ease-[ease] hover:-translate-y-px motion-reduce:transform-none ${FOCUS_RING}`}
      style={
        hasDue
          ? { background: NIGHT.btn, color: NIGHT.btnInk, boxShadow: '0 8px 20px rgba(0,0,0,.35)' }
          : { border: `1px solid ${NIGHT.bdA}`, background: NIGHT.tintB, color: NIGHT.soft }
      }
    >
      <PlayGlyph />
      {hasDue ? `Study ${due.toLocaleString()} due` : 'Study ahead'}
    </Link>
  );
}

type Props = {
  /** null = outer sky; a deck id = that deck is focused. */
  focusedDeckId: string | null;
  /** All-decks due total at the outer tier; the focused deck's figure inside
   *  one. `null` while the counts request is in flight. */
  dueCount: number | null;
  /** Outer tier only. */
  atDeckQuota: boolean;
  deckCount: number;
  onCreateDeck: (name: string) => Promise<void>;
  /** Focused tier only — opens the page's confirm step. */
  onRequestDeleteDeck: () => void;
};

export function StageChrome({
  focusedDeckId,
  dueCount,
  atDeckQuota,
  deckCount,
  onCreateDeck,
  onRequestDeleteDeck,
}: Props) {
  return (
    <>
      {/* Brand mark — the TopBar's tile-and-wordmark pair, sized down and pinned
          light-on-night (the TopBar itself doesn't render on this page). */}
      <Link
        href="/"
        aria-label="Aogimi home"
        className={`absolute top-[18px] left-[22px] z-40 flex items-center gap-[10px] transition-opacity duration-120 ease-[ease] hover:opacity-75 ${FOCUS_RING}`}
      >
        <span
          aria-hidden
          className="flex size-[30px] items-center justify-center rounded-(--radius-cover) font-[family-name:var(--face-jp)] text-[17px]"
          style={{ background: NIGHT.accent, color: NIGHT.ink }}
        >
          仰
        </span>
        <span className="font-[family-name:var(--face-ui)] text-[18px] font-bold" style={{ color: NIGHT.ink }}>
          aogimi
        </span>
      </Link>

      <div className="absolute top-[18px] right-[22px] z-40 flex items-center gap-2.5">
        {focusedDeckId === null ? (
          <>
            <StudyButton due={dueCount} href="/study?due=1" />
            <NewDeckButton
              atDeckQuota={atDeckQuota}
              deckCount={deckCount}
              onCreateDeck={onCreateDeck}
            />
          </>
        ) : (
          <>
            <StudyButton due={dueCount} href={`/study?deck=${focusedDeckId}`} />
            <button
              type="button"
              onClick={onRequestDeleteDeck}
              aria-label="Delete this deck"
              // hover fill is NIGHT.dangerBg, spelled as a class so it stays CSS
              className={`${SQUARE} bg-transparent transition-colors duration-120 ease-[ease] hover:bg-[rgba(224,113,90,.14)]`}
              style={{ border: `1px solid ${NIGHT.dangerBd}`, color: NIGHT.danger }}
            >
              <Trash2 size={16} strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>
    </>
  );
}

/* ── New deck ───────────────────────────────────────────────────────────── */

function NewDeckButton({
  atDeckQuota,
  deckCount,
  onCreateDeck,
}: {
  atDeckQuota: boolean;
  deckCount: number;
  onCreateDeck: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setName('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy || atDeckQuota) return;
    setBusy(true);
    try {
      await onCreateDeck(trimmed);
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-[11px] px-4 py-[11px] text-[13px] leading-none font-bold whitespace-nowrap transition-colors duration-120 ease-[ease] ${FOCUS_RING}`}
        style={{ border: `1px solid ${NIGHT.bdA}`, background: NIGHT.tintB, color: NIGHT.soft }}
      >
        <Plus size={14} strokeWidth={2} />
        New deck
      </button>

      {open && (
        <div
          className="absolute top-full right-0 z-50 mt-2 w-[264px] rounded-[12px] p-3.5 backdrop-blur-[14px]"
          style={{
            background: NIGHT.panel,
            border: `1px solid ${NIGHT.bdB}`,
            boxShadow: NIGHT.panelShadow,
          }}
        >
          {atDeckQuota ? (
            <p className="m-0 text-[12px] leading-relaxed" style={{ color: NIGHT.muted }}>
              {deckQuotaMessage(deckCount)}
            </p>
          ) : (
            <form onSubmit={submit}>
              <label className="block">
                <span className={`${MONO_LABEL} text-[8.5px] tracking-[0.16em] uppercase`} style={{ color: NIGHT.faint }}>
                  Deck name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name this deck"
                  // Mirrors the backend cap so the browser stops the typing
                  // rather than the server rejecting the submit.
                  maxLength={MAX_DECK_NAME}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      // this Escape means "close the form", not the page's tier walk
                      e.stopPropagation();
                      close();
                    }
                  }}
                  className="mt-1.5 w-full rounded-[9px] bg-transparent px-3 py-2 font-[family-name:var(--face-ui)] text-[13px] focus-visible:outline-none"
                  style={{ border: `1px solid ${NIGHT.bdA}`, color: NIGHT.ink }}
                />
              </label>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className={`rounded-[9px] px-3 py-2 text-[12px] font-bold ${FOCUS_RING}`}
                  style={{ border: `1px solid ${NIGHT.bdA}`, background: NIGHT.tintB, color: NIGHT.soft }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || busy}
                  className={`rounded-[9px] px-3 py-2 text-[12px] font-bold disabled:opacity-40 ${FOCUS_RING}`}
                  style={{ background: NIGHT.btn, color: NIGHT.btnInk }}
                >
                  Create
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
