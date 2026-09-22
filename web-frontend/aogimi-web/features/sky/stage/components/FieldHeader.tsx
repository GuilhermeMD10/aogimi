'use client';

import { Button, PANE } from '@/shared/components';
import { StarIcon } from '@/shared/icons';
import { cn } from '@/lib/util/cn';

import type { DeckWithCards } from '../types';
import { DeckMenuButton, type DeckMenuAction } from './DeckMenu';
import { StudyButton } from './StudyButton';

/**
 * The Sky field's header (pages 04/05), floating over the top of the map in
 * both tiers. Left is what you are looking at; right is what you can do.
 *
 *   whole sky     `SKY · 星空マップ` eyebrow + `N constellations` caption
 *                 · stars pill · ⋯ (New deck) · Continue Studying
 *   focused deck  back circle + deck name (+ its description, when the mobile
 *                 app gave it one) · stars pill · ⋯ (New · Rename · Delete)
 *                 · Study Deck Due
 *
 * Not built, by the owner's rulings: the `SYNCED` pill (no sync state on web)
 * and the `Stats` pill (cut). The ledger figures that used to sit up here
 * (days studied, due today, mastered, the mix bar) went with it.
 *
 * The row is `pointer-events-none` so the sky stays draggable through the gap
 * between its two clusters; each cluster re-enables them for itself. `SkyView`
 * cuts the camera's top inset to the row's bottom edge — 20 offset + 48 tall —
 * plus a gutter, so changing the pill heights means changing `FIELD_TOP`.
 */

const PILL_SHADOW = 'shadow-(--field-pill-shadow)';
const CAPTION =
  'font-[family-name:var(--face-mono)] text-[11px] tracking-[0.04em] uppercase text-[rgb(var(--night-ink-rgb)/0.5)]';

type Props = {
  /** The focused deck, or null at the whole-sky tier. */
  deck: DeckWithCards | null;
  deckCount: number;
  /** Stars in scope — every card, or the deck's. `null` until the inventory lands. */
  starCount: number | null;
  /** Due in scope. `null` while the counts request is in flight. */
  due: number | null;
  atDeckQuota: boolean;
  onBack: () => void;
  onStudyAhead: () => void;
  onMenu: (action: DeckMenuAction) => void;
};

export function FieldHeader({
  deck,
  deckCount,
  starCount,
  due,
  atDeckQuota,
  onBack,
  onStudyAhead,
  onMenu,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-6 top-5 z-30 flex items-center justify-between gap-4">
      {/* ── what you are looking at ── */}
      <div className="pointer-events-auto flex min-w-0 items-center gap-3.5">
        {deck ? (
          <>
            <Button
              variant="icon"
              glyph="back"
              size="sm"
              onClick={onBack}
              aria-label="Back to the whole sky"
              className={PILL_SHADOW}
            />
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="m-0 truncate font-[family-name:var(--face-jp)] text-[24px] leading-[1.1] font-bold text-(--night-ink)">
                {deck.name}
              </h2>
              {deck.description && <span className={cn(CAPTION, 'truncate normal-case')}>{deck.description}</span>}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-[family-name:var(--face-ui)] text-[11px] leading-none font-bold tracking-[0.16em] text-(--accent-soft)">
              SKY
              <span aria-hidden className="size-[5px] rounded-full bg-[rgb(var(--accent-soft-rgb)/0.5)]" />
              <span className="font-[family-name:var(--face-jp)] text-[12px] font-medium tracking-[0.04em]">
                星空マップ
              </span>
            </div>
            <span className={CAPTION}>
              {deckCount.toLocaleString()} {deckCount === 1 ? 'constellation' : 'constellations'} · pick one to
              open its deck
            </span>
          </div>
        )}
      </div>

      {/* ── what you can do ── */}
      <div className="pointer-events-auto flex shrink-0 items-center gap-2">
        <div
          className={cn(
            PANE,
            PILL_SHADOW,
            'flex h-11 items-center gap-1.5 rounded-full pr-4 pl-3.5 font-[family-name:var(--face-ui)] text-(--ink)',
          )}
        >
          <StarIcon size={14} className="text-(--accent)" />
          <span className="text-[14px] leading-none font-bold tabular-nums">
            {starCount === null ? '—' : starCount.toLocaleString()}
          </span>
          <span className="text-[12px] leading-none font-medium text-(--ink-3)">stars</span>
        </div>

        <DeckMenuButton
          scope={deck ? 'deck' : 'sky'}
          atDeckQuota={atDeckQuota}
          deckCount={deckCount}
          onAction={onMenu}
        />

        <div className="ml-2">
          <StudyButton
            due={due}
            href={deck ? `/study?deck=${deck.id}` : '/study?due=1'}
            onStudyAhead={onStudyAhead}
            scope={deck ? 'deck' : 'sky'}
          />
        </div>
      </div>
    </div>
  );
}
