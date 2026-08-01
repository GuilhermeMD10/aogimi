'use client';

import { CopyPlus } from 'lucide-react';
import { Button, Eyebrow, HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { Constellation } from './Constellation';
import { JlptChip } from './JlptChip';
import { SectionLabel } from './EntryDetail';
import { kanjiCardDraft } from '../lib/cardDraft';
import type { KanjiInfo } from '../types';

/**
 * A single character's entry, shown when the selected row is a kanji rather
 * than a word — `/api/search` returns these alongside the words for kanji and
 * kana queries.
 *
 * Deliberately not the same page as a word entry. The glyph sits in a ruled
 * block rather than running as bare type, and the character-only facts
 * (strokes, grade, radical) get a row of their own. A KANJIDIC character and a
 * JMdict word are different kinds of thing, and the layout should say so
 * before you've read a word of it.
 */
export function KanjiEntryDetail({
  kanji,
  onAddCard,
}: {
  kanji: KanjiInfo;
  onAddCard: (front: string, back: string, context?: string) => void;
}) {
  const facts = [
    { label: 'Strokes', value: kanji.stroke_count },
    { label: 'Grade', value: kanji.grade },
    { label: 'Radical', value: kanji.radical },
  ].filter((f): f is { label: string; value: number } => f.value != null);

  const addCard = () => {
    const draft = kanjiCardDraft(kanji);
    onAddCard(draft.front, draft.back, draft.context);
  };

  return (
    <article>
      <div className={cn('relative overflow-hidden border-b px-11 pt-[30px] pb-7', HAIRLINE)}>
        <Constellation />

        <div className="relative">
          <Eyebrow className="mb-[22px]">Kanji · 漢字</Eyebrow>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-end gap-7">
              {/* The ruled block is the tell: a word entry sets its headword as
                  bare type, a character sits in a frame. */}
              <div
                className={cn(
                  'flex size-[132px] shrink-0 items-center justify-center rounded-(--radius-card) border-2 bg-(--card)',
                  HAIRLINE,
                )}
              >
                <span className="font-[family-name:var(--face-jp)] text-[84px] leading-none text-(--ink)">
                  {kanji.literal}
                </span>
              </div>

              <div className="pb-2">
                {kanji.meanings.length > 0 && (
                  <p className="max-w-[420px] font-[family-name:var(--face-ui)] text-[22px] leading-tight text-(--ink)">
                    {kanji.meanings.join(', ')}
                  </p>
                )}

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <JlptChip level={kanji.jlpt_level} size="md" />
                  {facts.map((f) => (
                    <span
                      key={f.label}
                      className={cn(
                        'inline-flex items-center gap-[5px] rounded-(--radius-chip) border px-3 py-1',
                        'font-[family-name:var(--face-mono)] text-[11px] tracking-[0.04em] uppercase',
                        HAIRLINE,
                      )}
                    >
                      <span className="text-(--faint)">{f.label}</span>
                      <span className="text-(--soft)">{f.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Button icon={<CopyPlus size={18} strokeWidth={2} />} onClick={addCard}>
              Add to deck
            </Button>
          </div>
        </div>
      </div>

      <div className="px-11 pt-7">
        <div className="grid gap-[34px] xl:grid-cols-2">
          {kanji.on_readings.length > 0 && (
            <section>
              <SectionLabel en="On-yomi" jp="音読み" />
              <p
                className={cn(
                  'border-t py-[13px] font-[family-name:var(--face-jp)] text-[19px] leading-[1.5] text-(--ink)',
                  HAIRLINE,
                )}
              >
                {kanji.on_readings.join('、')}
              </p>
            </section>
          )}

          {kanji.kun_readings.length > 0 && (
            <section>
              <SectionLabel en="Kun-yomi" jp="訓読み" />
              <p
                className={cn(
                  'border-t py-[13px] font-[family-name:var(--face-jp)] text-[19px] leading-[1.5] text-(--ink)',
                  HAIRLINE,
                )}
              >
                {kanji.kun_readings.join('、')}
              </p>
            </section>
          )}
        </div>

        <p className="mt-8 text-right font-[family-name:var(--face-mono)] text-[11px] text-(--faint)">
          Source · KANJIDIC2
        </p>
      </div>
    </article>
  );
}
