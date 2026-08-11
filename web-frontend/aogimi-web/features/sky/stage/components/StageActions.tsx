'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { MAX_DECK_NAME, deckQuotaMessage } from '../lib/limits';
import { NIGHT } from '../lib/nightChrome';
import { StudyButton } from './StudyButton';

/**
 * The stage's one action cluster: "Study N due" and "New deck", side by side,
 * suspended over the sky. One component rather than a tier-branching wrapper
 * around two — there is a single set of actions now, so there is nothing left
 * to branch on.
 *
 * **Whole-sky only, and that is now the division of labour rather than a gap.**
 * This cluster carries the all-decks session (`/study?due=1`) and creating a
 * deck; a focused deck's own actions live on its own chrome — its session at
 * the top of the card list panel, deleting it at the right of `DeckBar` — so
 * both are one reach from the thing they act on. The button itself is shared
 * (`StudyButton`): only the scope differs, and the scope is the two props.
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

type Props = {
  /** The all-decks due total. `null` while the counts request is in flight. */
  dueCount: number | null;
  atDeckQuota: boolean;
  deckCount: number;
  onCreateDeck: (name: string) => Promise<void>;
  /** Open the practice overlay. Only reachable once nothing is due — the page
   *  owns the runner because it owns the cards it drills. */
  onStudyAhead: () => void;
};

export function StageActions({
  dueCount,
  atDeckQuota,
  deckCount,
  onCreateDeck,
  onStudyAhead,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-5 z-40 mx-auto flex w-full max-w-[1300px] justify-end px-11">
      <div className="pointer-events-auto flex items-center gap-2.5">
        <StudyButton due={dueCount} href="/study?due=1" onStudyAhead={onStudyAhead} />
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
