'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { MAX_DECK_NAME, deckQuotaMessage } from '../lib/limits';
import { NIGHT } from '../lib/nightChrome';

/**
 * The stage's one action cluster: "Study N due" and "New deck", side by side,
 * suspended over the sky. One component rather than a tier-branching wrapper
 * around two — there is a single set of actions now, so there is nothing left
 * to branch on.
 *
 * **Outer sky only.** The focused deck used to get its own pair here (a
 * deck-scoped "Study N due" and a delete-deck icon); both are gone for now and
 * will be reconsidered with the deck-details pass. Nothing is stranded by that:
 * deleting a deck is still `GlassColumn`'s own action, and studying one deck is
 * still `/study?deck={id}`.
 *
 * **Positioning is a full-width row, not a corner offset.** The cluster is
 * right-aligned inside the same bounded column the shared TopBar uses
 * (`max-w-[1300px]` + `px-11`), so its right edge lands on the TopBar's rather
 * than on the stage's — the stage itself is deliberately unbounded in width, so
 * an `absolute right-5` drifted further from the TopBar the wider the window
 * got. The wrapper is `pointer-events-none` so the sky stays draggable through
 * the empty half of the row; the cluster re-enables them for itself.
 *
 * The handover's "⋯" overflow menu is deliberately not built: its items
 * (import a deck, manage decks, sky settings) don't exist as features.
 */

const MONO_LABEL = 'font-[family-name:var(--face-mono)]';

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

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
  /** The all-decks due total. `null` while the counts request is in flight. */
  dueCount: number | null;
  atDeckQuota: boolean;
  deckCount: number;
  onCreateDeck: (name: string) => Promise<void>;
};

export function StageActions({ dueCount, atDeckQuota, deckCount, onCreateDeck }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-5 z-40 mx-auto flex w-full max-w-[1300px] justify-end px-11">
      <div className="pointer-events-auto flex items-center gap-2.5">
        <StudyButton due={dueCount} href="/study?due=1" />
        <NewDeckButton atDeckQuota={atDeckQuota} deckCount={deckCount} onCreateDeck={onCreateDeck} />
      </div>
    </div>
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
