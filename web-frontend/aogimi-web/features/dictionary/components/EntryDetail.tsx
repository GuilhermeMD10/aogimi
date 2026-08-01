'use client';

import { CopyPlus } from 'lucide-react';
import { Button, Eyebrow, HAIRLINE, Skeleton } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { Constellation } from './Constellation';
import { JlptChip } from './JlptChip';
import { KanjiCard } from './KanjiCard';
import { PitchAccent } from './PitchAccent';
import { preferredHeadword } from '../lib/headword';
import { wordCardDraft } from '../lib/cardDraft';
import type { DetailsResponse, WordResult } from '../types';

/**
 * The entry that fills the page beside the results rail.
 *
 * Split across two data sources on purpose. Everything above the fold —
 * headword, reading, pitch, pills, meanings — comes from the `WordResult` the
 * rail *already has*, so arrowing between results repaints instantly. Only the
 * kanji breakdown and the example sentences need `/api/words/:id/details`, and
 * only those two show a skeleton while it lands. The pane never blanks and
 * never jumps.
 *
 * There's no "← back to results" control: the rail is always on screen, so
 * there is nowhere for it to go back to.
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
  onAddCard: (front: string, back: string, context?: string) => void;
}) {
  const headword = preferredHeadword(word, query);
  const primaryReading = word.readings[0];
  const meanings = word.meanings.filter((m) => m.lang === 'eng');
  const pos = word.meanings[0]?.pos;

  const kanjis = details?.kanjis ?? [];
  const sentences = details?.sentences ?? [];

  const addCard = () => {
    const draft = wordCardDraft(word, query, details?.sentences);
    onAddCard(draft.front, draft.back, draft.context);
  };

  return (
    <article>
      {/* ── Hero band ─────────────────────────────────────────────────── */}
      <div className={cn('relative overflow-hidden border-b px-11 pt-[30px] pb-7', HAIRLINE)}>
        <Constellation />

        <div className="relative">
          <Eyebrow className="mb-[22px]">Dictionary · 辞書</Eyebrow>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-end gap-7">
              <div>
                <h1 className="font-[family-name:var(--face-jp)] text-[84px] leading-[0.92] text-(--ink)">
                  {headword}
                </h1>

                {primaryReading && (
                  <p className="mt-3 font-[family-name:var(--face-mono)] text-[15px] text-(--muted)">
                    {primaryReading.form}
                  </p>
                )}

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <JlptChip level={word.jlpt_level} size="md" />

                  {pos && (
                    <span
                      className={cn(
                        'inline-flex items-center rounded-(--radius-chip) border px-3 py-1',
                        'font-[family-name:var(--face-mono)] text-[11px] tracking-[0.04em] uppercase text-(--soft)',
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
                        'inline-flex cursor-pointer items-center gap-[5px] rounded-(--radius-cover) border bg-(--card) px-[11px] py-1',
                        'transition-[border-color] duration-120 ease-[ease] hover:border-(--accent)',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                        HAIRLINE,
                      )}
                    >
                      <span className="font-[family-name:var(--face-jp)] text-[15px] text-(--ink)">
                        {char}
                      </span>
                      {grade != null && (
                        <span className="font-[family-name:var(--face-mono)] text-[10px] text-(--muted)">
                          G{grade}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {primaryReading?.pitchAccents && (
                <div className="pb-2">
                  <PitchAccent
                    reading={primaryReading.form}
                    pitchAccents={primaryReading.pitchAccents}
                  />
                </div>
              )}
            </div>

            <Button icon={<CopyPlus size={18} strokeWidth={2} />} onClick={addCard}>
              Add to deck
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="px-11 pt-7">
        <div className="grid gap-[34px] xl:grid-cols-2">
          {meanings.length > 0 && (
            <section>
              <SectionLabel en="Meanings" jp="意味" />
              <div className="flex flex-col">
                {meanings.map((m, i) => (
                  <div
                    key={`${m.lang}-${i}`}
                    className={cn('flex gap-3.5 border-t py-[13px]', HAIRLINE)}
                  >
                    <span className="shrink-0 font-[family-name:var(--face-mono)] text-[13px] text-(--accent)">
                      {i + 1}
                    </span>
                    <p className="font-[family-name:var(--face-ui)] text-base leading-[1.5] text-(--ink)">
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
              <SectionLabel en="Kanji in this word" jp="漢字" />
              <div className="flex flex-col gap-3">
                {detailsError ? (
                  <FailedSection what="the kanji breakdown" />
                ) : detailsLoading ? (
                  <>
                    <Skeleton className="h-[142px] w-full" />
                    <Skeleton className="h-[142px] w-full" />
                  </>
                ) : (
                  kanjis.map((k) => (
                    <KanjiCard key={k.literal} kanji={k} onSelect={onKanjiSelect} />
                  ))
                )}
              </div>
            </section>
          )}
        </div>

        {(detailsLoading || detailsError || sentences.length > 0) && (
          <section className="mt-8">
            <SectionLabel en="Example sentences" jp="例文" />
            <div className="flex flex-col">
              {detailsError ? (
                <FailedSection what="example sentences" />
              ) : detailsLoading ? (
                <>
                  <Skeleton className="mt-4 h-[62px] w-full" />
                  <Skeleton className="mt-4 h-[62px] w-full" />
                </>
              ) : (
                sentences.map((s) => (
                  <div
                    key={s.id}
                    className={cn('flex items-center gap-[22px] border-t py-4', HAIRLINE)}
                  >
                    <div className="min-w-0 flex-1">
                      {s.jaRuby ? (
                        <div
                          className="font-[family-name:var(--face-jp)] text-[19px] leading-[1.5] text-(--ink)"
                          // Curated import of Kanjium's sentences.txt — a fixed
                          // format carrying only <ruby>/<rb>/<rp>/<rt>. No user
                          // content reaches this branch.
                          dangerouslySetInnerHTML={{ __html: s.jaRuby }}
                        />
                      ) : (
                        <div className="font-[family-name:var(--face-jp)] text-[19px] leading-[1.5] text-(--ink)">
                          {s.ja}
                        </div>
                      )}
                      <p className="mt-[5px] font-[family-name:var(--face-ui)] text-[15px] italic text-(--soft)">
                        {s.en}
                      </p>
                    </div>

                    {/* Grade is one label in the DB ("6 (6th grade of primary
                        school)"), not the handoff's separate grade + school
                        year, so the chip carries the single string. */}
                    {s.gradeLabel && (
                      <span
                        className={cn(
                          'shrink-0 rounded-(--radius-button) border bg-(--card) px-3 py-[5px]',
                          'font-[family-name:var(--face-mono)] text-[10.5px] font-bold whitespace-nowrap text-(--accent)',
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

        <p className="mt-8 text-right font-[family-name:var(--face-mono)] text-[11px] text-(--faint)">
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
    <p className="py-2 font-[family-name:var(--face-ui)] text-[13px] text-(--muted)">
      Couldn&rsquo;t load {what}.
    </p>
  );
}

export function SectionLabel({ en, jp }: { en: string; jp: string }) {
  return (
    <div className="mb-3.5 flex items-baseline gap-[9px]">
      <Eyebrow>{en}</Eyebrow>
      <span className="font-[family-name:var(--face-jp)] text-[13px] text-(--faint)">{jp}</span>
    </div>
  );
}
