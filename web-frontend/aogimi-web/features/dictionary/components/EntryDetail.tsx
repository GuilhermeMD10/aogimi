'use client';

import { CopyPlus } from 'lucide-react';
import { Button, GLASS_BUTTON, GLASS_PRESS, HAIRLINE, JlptChip, Skeleton } from '@/shared/components';
import type { CardDraft } from '@/features/sky/stage';
import { cn } from '@/lib/util/cn';
import { Constellation } from './Constellation';
import { EntryBack } from './EntryBack';
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
    charChip: string;
    charGlyph: string;
    charGrade: string;
    meaningRow: string;
    meaningNum: string;
    meaningText: string;
    kanjiSkeleton: string;
    sentenceRow: string;
    sentenceJa: string;
    sentenceEn: string;
    sentenceChip: string;
    sentenceSkeleton: string;
  }
> = {
  full: {
    charChip: 'px-[11px] py-1',
    charGlyph: 'text-[15px]',
    charGrade: 'text-[10px]',
    meaningRow: 'gap-3.5 py-[13px]',
    meaningNum: 'text-[16px]',
    meaningText: 'text-[18px] leading-[1.5]',
    kanjiSkeleton: 'h-[142px]',
    sentenceRow: 'items-center gap-[22px] py-4',
    sentenceJa: 'text-[20px] leading-[1.5]',
    sentenceEn: 'mt-[5px] text-[16px]',
    sentenceChip: 'px-3 py-[5px] text-[12px] whitespace-nowrap',
    sentenceSkeleton: 'mt-4 h-[62px]',
  },
  compact: {
    charChip: 'px-2 py-0.5',
    charGlyph: 'text-[13px]',
    charGrade: 'text-[9.5px]',
    meaningRow: 'gap-3 py-2.5',
    meaningNum: 'text-[12px]',
    meaningText: 'text-[14.5px] leading-[1.45]',
    kanjiSkeleton: 'h-[104px]',
    // The grade label is a whole sentence of its own ("6 (6th grade of primary
    // school)"), so beside the example it would leave the example a sliver.
    // Stacked, and allowed to wrap.
    sentenceRow: 'flex-col items-start gap-2 py-3.5',
    sentenceJa: 'text-[16.5px] leading-[1.55]',
    sentenceEn: 'mt-1 text-[13.5px]',
    sentenceChip: 'px-2 py-1 text-[9.5px]',
    sentenceSkeleton: 'mt-3 h-[56px]',
  },
};

/**
 * The entry itself, at whichever of the two scales its surface needs.
 *
 * Split across two data sources on purpose. Everything above the fold —
 * headword, reading, pitch, pills, meanings — comes from the `WordResult` the
 * caller *already has*, so arrowing between results repaints instantly. Only
 * the kanji breakdown and the example sentences need `/api/words/:id/details`,
 * and only those two show a skeleton while it lands. The pane never blanks and
 * never jumps.
 *
 * `onBack` is where the surfaces genuinely differ. `/dictionary` doesn't pass
 * it and shows no back control: the rail is on screen the whole time, so there
 * is nowhere for it to go back to. The reader's docked column and its bubble
 * show the entry *instead of* their list, so there the way back has to be in
 * the entry — same component, one prop, not a second design.
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
   *  splatting it into positionals here is what used to throw away the reading,
   *  the gloss list and the JLPT tier before they could reach a card. */
  onAddCard: (draft: CardDraft) => void;
  /** `full` is the `/dictionary` pane; `compact` a 320–480px column. */
  scale?: EntryScale;
  /** Present → a "← Results" control in the hero. Omit on a surface whose list
   *  stays visible beside the entry. */
  onBack?: () => void;
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
    <article>
      {/* ── Hero band ─────────────────────────────────────────────────── */}
      <div className={cn('relative overflow-hidden border-b', pane.band, HAIRLINE)}>
        {/* `full` only: the motif is composed to slice from the top-right of a
            wide band, so in a narrow column the visible slice is empty canvas
            plus a stray dot — decoration that reads as a rendering fault. */}
        {scale === 'full' && <Constellation />}

        <div className="relative">
          {onBack && <EntryBack onClick={onBack} />}

          <div className={pane.heroRow}>
            <div className={pane.heroMain}>
              <div>
                <h1 className={cn('font-[family-name:var(--face-jp)] text-(--ink) pt-10', pane.headword)}>
                  {headword}
                </h1>

                {primaryReading && (
                  <p className={cn('font-[family-name:var(--face-mono)] text-(--muted)', pane.reading)}>
                    {primaryReading.form}
                  </p>
                )}

                <div className={cn('flex flex-wrap items-center', pane.chipRow)}>
                  <JlptChip level={word.jlpt_level} size={pane.chip} />

                  {pos && (
                    <span
                      className={cn(
                        'inline-flex items-center rounded-(--radius-chip) border',
                        'font-[family-name:var(--face-mono)] tracking-[0.04em] uppercase text-(--soft)',
                        pane.pill,
                        HAIRLINE,
                      )}
                    >
                      {pos}
                    </span>
                  )}

                  {/* One chip per character with its school grade. Clicking it
                      re-runs the search for that kanji alone. */}
                  {word.char_grades.map(({ char, grade }) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => onKanjiSelect(char)}
                      className={cn(
                        // Same glass as the kanji cards below, which is the same
                        // character at a bigger size — a `--accent` edge on hover
                        // here and a brightening fill down there would have been
                        // two answers to one gesture.
                        GLASS_BUTTON,
                        GLASS_PRESS,
                        'inline-flex items-center gap-[5px] rounded-(--radius-cover)',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                        local.charChip,
                      )}
                    >
                      <span className={cn('font-[family-name:var(--face-jp)] text-(--ink)', local.charGlyph)}>
                        {char}
                      </span>
                      {grade != null && (
                        <span className={cn('font-[family-name:var(--face-mono)] text-(--muted)', local.charGrade)}>
                          G{grade}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {primaryReading?.pitchAccents && (
                <div className={pane.pitch}>
                  <PitchAccent reading={primaryReading.form} pitchAccents={primaryReading.pitchAccents} />
                </div>
              )}
            </div>

            <Button icon={<CopyPlus size={18} strokeWidth={2} />} onClick={addCard} className={pane.action}>
              Add to deck
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className={pane.body}>
        <div className={cn('grid', pane.grid)}>
          {meanings.length > 0 && (
            <section>
              <SectionLabel en="Meanings" jp="" />
              <div className="flex flex-col">
                {meanings.map((m, i) => (
                  <div key={`${m.lang}-${i}`} className={cn('flex border-t', local.meaningRow, HAIRLINE)}>
                    <span
                      className={cn('shrink-0 font-[family-name:var(--face-mono)] text-(--accent)', local.meaningNum)}
                    >
                      {i + 1}
                    </span>
                    <p className={cn('font-[family-name:var(--face-ui)] text-(--ink)', local.meaningText)}>
                      {m.meaning}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* The breakdown waits on the details request. A kana-only entry has
              no kanji at all, so the section only appears once we know — but a
              *failed* request keeps it, and says so. */}
          {(detailsLoading || detailsError || kanjis.length > 0) && (
            <section>
              <SectionLabel en="Kanji in this word" jp="" />
              <div className="flex flex-col gap-3">
                {detailsError ? (
                  <FailedSection what="the kanji breakdown" />
                ) : detailsLoading ? (
                  <>
                    <Skeleton className={cn('w-full', local.kanjiSkeleton)} />
                    <Skeleton className={cn('w-full', local.kanjiSkeleton)} />
                  </>
                ) : (
                  kanjis.map((k) => <KanjiCard key={k.literal} kanji={k} onSelect={onKanjiSelect} scale={scale} />)
                )}
              </div>
            </section>
          )}
        </div>

        {(detailsLoading || detailsError || sentences.length > 0) && (
          <section className={pane.section}>
            <SectionLabel en="Example sentences" jp="" />
            <div className="flex flex-col">
              {detailsError ? (
                <FailedSection what="example sentences" />
              ) : detailsLoading ? (
                <>
                  <Skeleton className={cn('w-full', local.sentenceSkeleton)} />
                  <Skeleton className={cn('w-full', local.sentenceSkeleton)} />
                </>
              ) : (
                sentences.map((s) => (
                  <div key={s.id} className={cn('flex border-t', local.sentenceRow, HAIRLINE)}>
                    <div className="min-w-0 flex-1">
                      {s.jaRuby ? (
                        <div
                          className={cn('font-[family-name:var(--face-jp)] text-(--ink)', local.sentenceJa)}
                          // Curated import of Kanjium's sentences.txt — a fixed
                          // format carrying only <ruby>/<rb>/<rp>/<rt>. No user
                          // content reaches this branch.
                          dangerouslySetInnerHTML={{ __html: s.jaRuby }}
                        />
                      ) : (
                        <div className={cn('font-[family-name:var(--face-jp)] text-(--ink)', local.sentenceJa)}>
                          {s.ja}
                        </div>
                      )}
                      <p className={cn('font-[family-name:var(--face-ui)] italic text-(--soft)', local.sentenceEn)}>
                        {s.en}
                      </p>
                    </div>

                    {/* Grade is one label in the DB ("6 (6th grade of primary
                        school)"), not the handoff's separate grade + school
                        year, so the chip carries the single string. */}
                    {s.gradeLabel && (
                      <span
                        className={cn(
                          'shrink-0 rounded-(--radius-button) border bg-(--card)',
                          'font-[family-name:var(--face-mono)] font-bold text-(--accent)',
                          local.sentenceChip,
                          HAIRLINE,
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

        <p className={cn('text-right font-[family-name:var(--face-mono)] text-(--faint)', pane.source)}>
          Source · JMdict{sentences.length > 0 && ' · Tatoeba (via Kanjium)'}
        </p>
      </div>
    </article>
  );
}

/** Keeps the section, softens the content — the rule the whole redesign uses
 *  for a failed request. Silence here reads as "this word has none", which is
 *  a different and wrong statement. */
function FailedSection({ what }: { what: string }) {
  return (
    <p className="py-2 font-[family-name:var(--face-ui)] text-[13px] text-(--muted)">Couldn&rsquo;t load {what}.</p>
  );
}
