'use client';

import { Plus } from 'lucide-react';
import { Button, Chip, JlptChip } from '@/shared/components';
import type { CardDraft } from '@/features/sky/stage';
import { cn } from '@/lib/util/cn';
import { EntryBack } from './EntryBack';
import { EntryHeader } from './EntryHeader';
import { SectionLabel } from './SectionLabel';
import { kanjiCardDraft } from '../lib/cardDraft';
import { ENTRY_SCALE, type EntryScale } from '../lib/entryScale';
import type { KanjiInfo } from '../types';

/** Values only this pane uses — see `lib/entryScale.ts` for the shared ones. */
const LOCAL: Record<EntryScale, { frame: string; frameGlyph: string; meanings: string; readings: string }> = {
  full: {
    frame: 'size-[124px] rounded-(--radius-tile)',
    frameGlyph: 'text-[76px]',
    meanings: 'max-w-[420px] text-[20px]',
    readings: 'text-[18px]',
  },
  compact: {
    // A smaller frame keeps the tell (a character is framed, a word isn't)
    // without eating a quarter of a 320px column, and the softer radius keeps
    // the box from reading as a card at that size.
    frame: 'size-[84px] rounded-(--radius-control)',
    frameGlyph: 'text-[52px]',
    meanings: 'text-[16px]',
    readings: 'text-[16px]',
  },
};

/**
 * A single character's entry, shown when the selected row is a kanji rather
 * than a word — `/api/search` returns these alongside the words for kanji and
 * kana queries. The handoff draws no kanji entry, so this keeps today's
 * layout in the word entry's tokens and type (D9).
 *
 * Deliberately not the same page as a word entry. The glyph sits in a framed
 * block rather than running as bare type, and the character-only facts
 * (strokes, grade, radical) get chips of their own. A KANJIDIC character and a
 * JMdict word are different kinds of thing, and the layout should say so
 * before you've read a word of it.
 *
 * `scale`, `onBack` and `backClassName` mean what they do on `EntryDetail`.
 */
export function KanjiEntryDetail({
  kanji,
  onAddCard,
  scale = 'full',
  onBack,
  backClassName,
}: {
  kanji: KanjiInfo;
  /** Takes the whole draft — see `EntryDetail` for why it isn't positionals. */
  onAddCard: (draft: CardDraft) => void;
  scale?: EntryScale;
  onBack?: () => void;
  backClassName?: string;
}) {
  const pane = ENTRY_SCALE[scale];
  const local = LOCAL[scale];

  const facts = [
    { label: 'Strokes', value: kanji.stroke_count },
    { label: 'Grade', value: kanji.grade },
    { label: 'Radical', value: kanji.radical },
  ].filter((f): f is { label: string; value: number } => f.value != null);

  const addCard = () => onAddCard(kanjiCardDraft(kanji));

  return (
    <article className={cn('font-[family-name:var(--face-ui)]', pane.pad)}>
      <EntryHeader jp="漢字">{onBack && <EntryBack onClick={onBack} className={backClassName} />}</EntryHeader>

      <div className={cn(pane.header, pane.heroRow)}>
        <div className={cn('flex min-w-0 gap-5', scale === 'compact' ? 'flex-col' : 'items-center')}>
          {/* The framed block is the tell: a word entry sets its headword as
              bare type, a character sits in a frame. */}
          <div
            className={cn(
              'flex shrink-0 items-center justify-center border border-(--hairline) bg-(--pane-strong) shadow-(--shadow-pill)',
              local.frame,
            )}
          >
            <span className={cn('font-[family-name:var(--face-jp)] leading-none font-bold text-(--good)', local.frameGlyph)}>
              {kanji.literal}
            </span>
          </div>

          <div className="min-w-0">
            {kanji.meanings.length > 0 && (
              <p className={cn('leading-tight font-bold text-(--ink)', local.meanings)}>{kanji.meanings.join('; ')}</p>
            )}

            <div className={cn('flex flex-wrap items-center', pane.chipRow)}>
              <JlptChip level={kanji.jlpt_level} size={pane.chip} />
              {facts.map((f) => (
                <Chip key={f.label}>
                  {f.label} <span className="text-(--ink)">{f.value}</span>
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <Button variant="good" size="sm" icon={<Plus size={14} strokeWidth={2.4} aria-hidden />} onClick={addCard} className={pane.action}>
          Add to deck
        </Button>
      </div>

      {kanji.on_readings.length > 0 && (
        <section className={pane.meanings}>
          <SectionLabel en="On-yomi" jp="音読み" />
          <p className={cn('mt-3 font-[family-name:var(--face-jp)] leading-[1.5] font-bold text-(--ink)', local.readings)}>
            {kanji.on_readings.join('・')}
          </p>
        </section>
      )}

      {kanji.kun_readings.length > 0 && (
        <section className={kanji.on_readings.length > 0 ? pane.section : pane.meanings}>
          <SectionLabel en="Kun-yomi" jp="訓読み" />
          <p className={cn('mt-3 font-[family-name:var(--face-jp)] leading-[1.5] font-bold text-(--ink)', local.readings)}>
            {kanji.kun_readings.join('・')}
          </p>
        </section>
      )}
    </article>
  );
}
