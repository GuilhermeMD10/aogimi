'use client';

import Link from 'next/link';
import { Languages, Trash2, X } from 'lucide-react';

import {
  GLASS_BUTTON,
  GLASS_PRESS,
  GLASS_SURFACE,
  JlptChip,
  stageColor,
  stageLabel,
} from '@/shared/components';
import { cn } from '@/lib/util/cn';

import { NIGHT } from '../lib/nightChrome';
import { nextState, rankProgress, shownRank } from '../lib/rankProgress';
import type { CardRecord } from '../types';

/**
 * The selected card's detail — a floating glass card on the **opposite side of
 * the sky** from the card list.
 *
 * Not a second state of the list panel: replacing the list would mean opening a
 * card costs you the list, so comparing two cards — or even knowing where in the
 * deck you were — would mean closing the thing you were reading. Here the list
 * stays up and keeps its row highlight, and the camera
 * simply takes a second inset on the right (`DECK_INSETS_DETAIL` in `SkyView`)
 * so the ringed star is never underneath either panel.
 *
 * Closing is the × here, the list row again, or Escape — the page's tier walk
 * treats a selected card as one level in (card → deck → sky), unchanged.
 *
 * Deliberately still absent, and for the same reasons as before the move:
 *   - **part of speech** — nothing on a `cards` row records one; it would be a
 *     snapshot column captured at add time, the way `jlpt_level` is;
 *   - **an example translation** — `context_sentence` stores the sentence alone.
 */

const MONO = 'font-[family-name:var(--face-mono)]';
const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

type Props = {
  card: CardRecord;
  /** Clear the selection — the × button. */
  onClose: () => void;
  /** Opens the page's confirm step; deletion itself happens there. */
  onRequestDelete: () => void;
};

export function CardDetailCard({ card, onClose, onRequestDelete }: Props) {
  // The *displayed* rank, not the raw column: a card that has reached Learned
  // keeps its tier through a lapse (see `fsrs.displayedRank`), and this badge
  // sits beside the star that is already drawn that way.
  const state = shownRank(cardArgs(card));
  const color = stageColor(state);
  const next = nextState(state);
  const progress = rankProgress(cardArgs(card));
  const atTop = next === null;

  return (
    <div
      className={cn(
        GLASS_SURFACE,
        // Bottom is not pinned: the card is as tall as its content up to the
        // room between its top and the list panel's own bottom edge (92 + 78),
        // so a one-meaning card doesn't draw a mostly-empty pane down the
        // screen. It is wider than the list on purpose — the list gave up its
        // reading and glosses so that this could carry them at full size.
        'absolute top-[92px] right-5 z-30 flex max-h-[calc(100%-170px)] w-[340px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-[20px]',
      )}
    >
      {/* ── header ── */}
      <div
        className="flex shrink-0 items-center gap-2.5 px-3.5 pt-3 pb-2.5"
        style={{ borderBottom: `1px solid ${NIGHT.bdB}` }}
      >
        <span className={`${MONO} flex-1 text-[9.5px] tracking-[0.16em]`} style={{ color: NIGHT.muted }}>
          CARD DETAIL
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-[7px] rounded-[20px] px-2.5 py-[3px]"
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}
        >
          <span aria-hidden className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="text-[11px] font-bold" style={{ color: NIGHT.soft }}>
            {stageLabel(state)}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the card detail"
          className={cn(
            GLASS_BUTTON,
            GLASS_PRESS,
            'flex size-7 shrink-0 items-center justify-center rounded-[8px]',
            FOCUS_RING,
          )}
          style={{ color: NIGHT.soft }}
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── body ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3.5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-[family-name:var(--face-jp)] text-[33px] leading-[1.15] font-bold" style={{ color: NIGHT.ink }}>
              {card.front}
            </div>
            {card.reading && (
              <div className={`mt-[7px] ${MONO} text-xs tracking-[0.05em]`} style={{ color: NIGHT.muted }}>
                {card.reading}
              </div>
            )}
          </div>
          {/* The shared `JlptChip` and its per-level ramp, not a local gold pill:
              the colour IS the level, and the dictionary renders the same five.
              Gated on non-null rather than left to the chip's own guard — its
              out-of-range fallback paints with `--faint`, a theme token that
              reads wrong on this night glass. */}
          {card.jlpt_level !== null && (
            <JlptChip level={card.jlpt_level} className="mt-1 shrink-0" />
          )}
        </div>

        {/* Either the glosses or `back`, never both: on a card that has
            `meanings`, `back` is a rendering of the very same reading + glosses,
            so drawing both would print the card's whole content twice.
            `meanings` empty means a card older than migration 026 (or made by
            hand, or on mobile) — those get `back` unparsed, because the blob
            follows no convention that survives being split. */}
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${NIGHT.bdB}` }}>
          {card.meanings.length > 0 ? (
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
              {card.meanings.map((meaning, i) => (
                <li
                  key={i}
                  className="flex gap-2 font-[family-name:var(--face-ui)] text-[15.5px] leading-[1.45]"
                  style={{ color: NIGHT.soft }}
                >
                  <span
                    aria-hidden
                    className={`shrink-0 pt-[3px] ${MONO} text-[10px] tabular-nums`}
                    style={{ color: NIGHT.faint }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">{meaning}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="font-[family-name:var(--face-ui)] text-[15.5px] leading-[1.45]" style={{ color: NIGHT.soft }}>
              {card.back}
            </div>
          )}
        </div>

        {/* No translation line beside the sentence: nothing stores one, so the
            box is the sentence alone and disappears with it. */}
        {card.context_sentence && (
          <div className={cn(GLASS_SURFACE, 'mt-3.25 rounded-[12px] px-3.25 py-2.75')}>
            <div className={`mb-[7px] ${MONO} text-[8.5px] tracking-[0.16em]`} style={{ color: NIGHT.faint }}>
              IN CONTEXT
            </div>
            <div className="font-[family-name:var(--face-jp)] text-[14.5px] leading-[1.7]" style={{ color: NIGHT.ink }}>
              {card.context_sentence}
            </div>
          </div>
        )}

        <div className="mt-3.5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className={`${MONO} text-[9px] tracking-[0.16em]`} style={{ color: NIGHT.faint }}>
              MASTERY
            </span>
            <span
              className={`${MONO} text-[10.5px] font-bold`}
              style={{ color: atTop ? color : stageColor(next) }}
            >
              {atTop ? 'MAX ★' : `${progress}% →`}
            </span>
          </div>
          <div className="relative h-[7px] overflow-hidden rounded-[5px]" style={{ background: NIGHT.track }}>
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${atTop ? 100 : progress}%`,
                background: atTop ? color : `linear-gradient(90deg, ${color}, ${stageColor(next)})`,
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between">
            <span className={`inline-flex items-center gap-1.5 ${MONO} text-[9.5px]`} style={{ color: NIGHT.muted }}>
              <span aria-hidden className="size-[7px] rounded-full" style={{ background: color }} />
              {stageLabel(state)}
            </span>
            <span className={`inline-flex items-center gap-1.5 ${MONO} text-[9.5px]`} style={{ color: NIGHT.faint }}>
              {atTop ? '★ top rank' : stageLabel(next)}
              {!atTop && (
                <span aria-hidden className="size-[7px] rounded-full" style={{ background: stageColor(next) }} />
              )}
            </span>
          </div>
        </div>

        <div className="mt-3.5 flex items-baseline justify-between">
          <span className={`${MONO} text-[9px] tracking-[0.16em]`} style={{ color: NIGHT.faint }}>
            ADDED
          </span>
          <span className={`${MONO} text-[11px]`} style={{ color: NIGHT.soft }}>
            {addedLabel(card.created_at)}
          </span>
        </div>

        {/* ── footer: labelled quiet glass, not the old equal-width icon pair ── */}
        <div className="mt-4 flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${NIGHT.bdB}` }}>
          <Link
            href={`/dictionary?q=${encodeURIComponent(card.front)}`}
            aria-label={`Look up ${card.front} in the dictionary`}
            className={cn(
              GLASS_BUTTON,
              GLASS_PRESS,
              'inline-flex items-center gap-2 rounded-[9px] px-3 py-2 text-[11.5px] leading-none font-bold',
              FOCUS_RING,
            )}
            style={{ color: NIGHT.soft }}
          >
            <Languages size={14} strokeWidth={1.7} aria-hidden />
            Dictionary
          </Link>
          <button
            type="button"
            onClick={onRequestDelete}
            aria-label={`Delete ${card.front}`}
            className={cn(
              GLASS_BUTTON,
              GLASS_PRESS,
              'ml-auto inline-flex items-center gap-2 rounded-[9px] px-3 py-2 text-[11.5px] leading-none font-bold',
              FOCUS_RING,
            )}
            style={{ color: NIGHT.danger }}
          >
            <Trash2 size={14} strokeWidth={1.8} aria-hidden />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

/** The meter's inputs off a raw card row.
 *
 *  `stability` is legitimately null on a never-reviewed card, so it is passed
 *  through rather than defaulted — `rankProgress` reads null as "rank new",
 *  which is what it means. `peak_rank` falls back to `state` for rows fetched
 *  before migration 027 added the column: "never been higher than it is now",
 *  the reading that can't overstate progress. */
function cardArgs(card: CardRecord) {
  return {
    state: card.state ?? 'new',
    peakRank: card.peak_rank ?? card.state ?? 'new',
    stability: card.stability,
    lastReviewedAt: card.last_reviewed_at ?? null,
  };
}

function addedLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
