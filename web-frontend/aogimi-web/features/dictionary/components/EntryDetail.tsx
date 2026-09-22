'use client';

import { Plus } from 'lucide-react';
import { Button, Chip, JlptChip, PRESS, Skeleton } from '@/shared/components';
import type { CardDraft } from '@/features/sky/stage';
import { cn } from '@/lib/util/cn';
import { EntryBack } from './EntryBack';
import { EntryHeader } from './EntryHeader';
import { KanjiCard } from './KanjiCard';
import { PitchAccent } from './PitchAccent';
import { SectionLabel } from './SectionLabel';
import { preferredHeadword } from '../lib/headword';
import { wordCardDraft } from '../lib/cardDraft';
import { ENTRY_SCALE, type EntryScale } from '../lib/entryScale';
import type { DetailsResponse, WordResult } from '../types';

/** Values only this pane uses. What it shares with the kanji pane and the kanji
 *  cards lives in `lib/entryScale.ts`, so all three step down together. */
const LOCAL: Record<
  EntryScale,
  {
    meaningText: string;
    kanjiSkeleton: string;
    sentenceRow: string;
    sentenceJa: string;
    sentenceEn: string;
    sentenceSkeleton: string;
  }
> = {
  full: {
    meaningText: 'text-[15px]',
    kanjiSkeleton: 'h-[124px]',
    sentenceRow: 'flex-row items-start gap-5',
    sentenceJa: 'text-[16px]',
    sentenceEn: 'text-[13px]',
    sentenceSkeleton: 'h-[62px]',
  },
  compact: {
    meaningText: 'text-[14px]',
    kanjiSkeleton: 'h-[104px]',
    // The grade label is a whole sentence of its own ("6 (6th grade of primary
    // school)"), so beside the example it would leave the example a sliver.
    // Stacked, and allowed to wrap.
    sentenceRow: 'flex-col items-start gap-2',
    sentenceJa: 'text-[15px]',
    sentenceEn: 'text-[13px]',
    sentenceSkeleton: 'h-[56px]',
  },
};

/**
 * The word entry (page 03 → Right pane), at whichever of the two scales its
 * surface needs. The surface owns the box — the gradient card on `/dictionary`,
 * the modal, the docked column; this owns the inset and everything inside it.
 *
 * Split across two data sources on purpose. Everything above the fold —
 * headword, reading, pitch, chips, meanings — comes from the `WordResult` the
 * caller *already has*, so arrowing between results repaints instantly. Only
 * the kanji breakdown and the example sentences need `/api/words/:id/details`,
 * and only those two show a skeleton while it lands. The pane never blanks and
 * never jumps.
 *
 * `onBack` is where the surfaces differ. The reader's modal and docked column
 * show the entry *instead of* their list, so the way back has to be in the
 * entry. `/dictionary` keeps the list beside the entry and passes it with
 * `backClassName="lg:hidden"`, so the link appears only once the panes stack.
 *
 * Sections with no data are omitted whole. An empty "Examples" heading is a
 * statement that the entry has none; leaving it out isn't.
 */
export function EntryDetail({
  word,
  query,
  details,
  detailsLoading,
  detailsError,
  onKanjiSelect,
  onAddCard,
  scale = 'full',
  onBack,
  backClassName,
}: {
  word: WordResult;
  query: string;
  /** Null until the details request for *this* word resolves. */
  details: DetailsResponse | null;
  detailsLoading: boolean;
  /** Set when the details request failed — the two lower sections say so
   *  rather than quietly rendering as if the entry had no kanji and no
   *  examples, which is indistinguishable from a bug. */
  detailsError: string | null;
  onKanjiSelect: (literal: string) => void;
  /** Takes the whole draft. The pane builds it and hands it over structured —
   *  splatting it into positionals here would throw away the reading, the
   *  gloss list and the JLPT tier before they could reach a card. */
  onAddCard: (draft: CardDraft) => void;
  /** `full` is the `/dictionary` card and the modal; `compact` a 320–480px column. */
  scale?: EntryScale;
  /** Present → "‹ back to results" in the header row. */
  onBack?: () => void;
  /** Classes on that link — `/dictionary` hides it while the list is beside the entry. */
  backClassName?: string;
}) {
  const pane = ENTRY_SCALE[scale];
  const local = LOCAL[scale];

  const headword = preferredHeadword(word, query);
  const primaryReading = word.readings[0];
  const meanings = word.meanings.filter((m) => m.lang === 'eng');
  const pos = word.meanings[0]?.pos;

  const kanjis = details?.kanjis ?? [];
  const sentences = details?.sentences ?? [];

  const addCard = () => onAddCard(wordCardDraft(word, query, details?.sentences));

  return (
    <article className={cn('font-[family-name:var(--face-ui)]', pane.pad)}>
      <EntryHeader jp="辞書">
        {onBack && <EntryBack onClick={onBack} className={backClassName} />}
      </EntryHeader>

      {/* ── Word block ─────────────────────────────────────────────────── */}
      <div className={cn(pane.header, pane.heroRow)}>
        <div className="min-w-0">
          <h1 className={cn('font-[family-name:var(--face-jp)] font-bold text-(--ink)', pane.headword)}>{headword}</h1>

          {primaryReading && primaryReading.form !== headword && (
            <p className={cn('font-[family-name:var(--face-jp)] leading-none font-medium text-(--ink-2)', pane.reading)}>
              {primaryReading.form}
            </p>
          )}

          <div className={cn('flex flex-wrap items-center', pane.chipRow)}>
            <JlptChip level={word.jlpt_level} size={pane.chip} />

            {pos && <Chip className="font-bold tracking-[0.08em]">{pos}</Chip>}

            {/* One chip per character with its school grade, in the `good`
                family. Clicking it re-runs the search for that kanji alone. */}
            {word.char_grades.map(({ char, grade }) => (
              <button
                key={char}
                type="button"
                onClick={() => onKanjiSelect(char)}
                title={`Look up ${char}`}
                className={cn(
                  PRESS,
                  'inline-flex cursor-pointer items-center gap-1 rounded-(--radius-chip) border px-[7px] py-[3px] leading-none text-(--good)',
                  '[background:color-mix(in_srgb,var(--good)_10%,transparent)] [border-color:color-mix(in_srgb,var(--good)_35%,transparent)]',
                  'transition-[filter,transform] duration-120 ease-[ease] hover:brightness-[1.06]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                )}
              >
                <span className="font-[family-name:var(--face-jp)] text-[11px] font-bold">{char}</span>
                {grade != null && <span className="text-[10px] font-bold">G{grade}</span>}
              </button>
            ))}

            {primaryReading?.pitchAccents && (
              <div className={pane.pitch}>
                <PitchAccent reading={primaryReading.form} pitchAccents={primaryReading.pitchAccents} />
              </div>
            )}
          </div>
        </div>

        <Button variant="good" size="sm" icon={<Plus size={14} strokeWidth={2.4} aria-hidden />} onClick={addCard} className={pane.action}>
          Add to deck
        </Button>
      </div>

      {/* ── Meanings ───────────────────────────────────────────────────── */}
      {meanings.length > 0 && (
        <section className={pane.meanings}>
          <SectionLabel en="Meanings" jp="意味" />
          <ol className="mt-3 flex flex-col gap-2.5">
            {meanings.map((m, i) => (
              <li key={`${m.lang}-${i}`} className="flex gap-3">
                <span className="w-3 shrink-0 text-[12px] leading-[1.5] font-bold text-(--accent) tabular-nums">{i + 1}</span>
                <p className={cn('leading-[1.5] font-medium text-(--ink)', local.meaningText)}>{m.meaning}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Kanji in this word ─────────────────────────────────────────── */}
      {/* The breakdown waits on the details request. A kana-only entry has no
          kanji at all, so the section only appears once we know — but a
          *failed* request keeps it, and says so. */}
      {(detailsLoading || detailsError || kanjis.length > 0) && (
        <section className={pane.section}>
          <SectionLabel en="Kanji in this word" jp="漢字" />
          <div className={cn('mt-3 grid', pane.kanjiGrid)}>
            {detailsError ? (
              <FailedSection what="the kanji breakdown" />
            ) : detailsLoading ? (
              <>
                <Skeleton className={cn('w-full rounded-(--radius-tile)', local.kanjiSkeleton)} />
                <Skeleton className={cn('w-full rounded-(--radius-tile)', local.kanjiSkeleton)} />
              </>
            ) : (
              kanjis.map((k) => <KanjiCard key={k.literal} kanji={k} onSelect={onKanjiSelect} scale={scale} />)
            )}
          </div>
        </section>
      )}

      {/* ── Example sentences ──────────────────────────────────────────── */}
      {(detailsLoading || detailsError || sentences.length > 0) && (
        <section className={pane.section}>
          <SectionLabel en="Example sentences" jp="例文" />
          <div className="mt-1 flex flex-col [&>*+*]:border-t [&>*+*]:border-[rgb(var(--line-rgb)/0.07)]">
            {detailsError ? (
              <FailedSection what="example sentences" />
            ) : detailsLoading ? (
              <>
                <Skeleton className={cn('mt-3 w-full', local.sentenceSkeleton)} />
                <Skeleton className={cn('mt-3 w-full', local.sentenceSkeleton)} />
              </>
            ) : (
              sentences.map((s) => (
                <div key={s.id} className={cn('flex justify-between py-4', local.sentenceRow)}>
                  <div className="min-w-0 flex-1">
                    {s.jaRuby ? (
                      <div
                        className={cn('font-[family-name:var(--face-jp)] leading-[1.5] font-bold text-(--ink)', local.sentenceJa)}
                        // Curated import of Kanjium's sentences.txt — a fixed
                        // format carrying only <ruby>/<rb>/<rp>/<rt>. No user
                        // content reaches this branch.
                        dangerouslySetInnerHTML={{ __html: s.jaRuby }}
                      />
                    ) : (
                      <div className={cn('font-[family-name:var(--face-jp)] leading-[1.5] font-bold text-(--ink)', local.sentenceJa)}>
                        {s.ja}
                      </div>
                    )}
                    <p className={cn('mt-1 italic text-(--ink-2)', local.sentenceEn)}>{s.en}</p>
                  </div>

                  {/* Grade is one label in the DB ("6 (6th grade of primary
                      school)"), not a separate grade + school year, so the
                      chip carries the single string. */}
                  {s.gradeLabel && (
                    <span
                      className={cn(
                        'inline-flex h-7 shrink-0 items-center rounded-(--radius-row) border border-[rgb(var(--line-rgb)/0.07)] bg-(--pane-strong) px-3',
                        'text-[11px] leading-none font-bold text-(--accent)',
                      )}
                    >
                      {s.gradeLabel}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </article>
  );
}

/** Keeps the section, softens the content — the rule the whole app uses
 *  for a failed request. Silence here reads as "this word has none", which is
 *  a different and wrong statement. */
function FailedSection({ what }: { what: string }) {
  return <p className="py-2 text-[13px] text-(--ink-3)">Couldn&rsquo;t load {what}.</p>;
}
