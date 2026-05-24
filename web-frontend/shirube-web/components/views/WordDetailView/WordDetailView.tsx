'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Volume2, Star } from 'lucide-react';
import { InfoRow } from '@/components/ui/InfoRow';
import { JlptChip } from '@/components/ui/JlptChip';
import { SectionHead } from '@/components/ui/SectionHead';
import { ThemedDecoration } from '@/components/theme-decorations/ThemedDecoration';
import { Postmark } from '@/components/theme-decorations/stamp/Postmark';
import { getWordDetails } from '@/lib/dictApi';
import type { DetailsResponse } from '@/lib/types';
import { MAX_MEANINGS_ON_CARD } from '@/components/decks/utils/cardLimits';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { PitchAccentDiagram } from '@/components/ui/PitchAccentDiagram';

// If the user's query matches one of the entry's kanji or reading forms exactly,
// surface that form instead of the dict's "primary" common kanji.
export function preferredHeadword(
  word: { kanji: string[]; readings: { form: string }[] },
  query: string | undefined,
): string {
  const q = (query ?? '').trim();
  if (q && word.kanji.includes(q)) return q;
  if (q && word.readings.some((r) => r.form === q)) return q;
  return word.kanji[0] ?? word.readings[0]?.form ?? '—';
}

export default function WordDetailView({
  id,
  query,
  onBack,
  onKanjiSearch,
  onAddCard,
}: {
  id: string;
  query?: string;
  onBack?: () => void;
  onKanjiSearch?: (char: string) => void;
  onAddCard?: (word: string, back: string) => void;
}) {
  const router = useRouter();
  const { data, loading, error } = useFetchWithAbort<DetailsResponse>(
    (signal) => getWordDetails(id, signal),
    [id],
  );

  const searchKanji = (char: string) => {
    if (onKanjiSearch) {
      onKanjiSearch(char);
    } else {
      router.push(`/dictionary?q=${encodeURIComponent(char)}`);
    }
  };

  const handleBack = onBack ?? (() => router.push('/dictionary'));

  return (
    <div className="@container relative flex min-h-full w-full flex-col">
      <div
        className="flex items-center gap-2.5 border-b border-lgc-border px-5 py-3"
        style={{
          background: 'var(--lgc-toolbar-bg)',
          backdropFilter: 'var(--lgc-toolbar-backdrop-filter)',
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 px-2 py-1 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
          style={{
            borderRadius: 'var(--lgc-toolbar-button-radius)',
            fontFamily: 'var(--lgc-toolbar-button-font-family)',
            letterSpacing: 'var(--lgc-toolbar-button-tracking)',
            textTransform: 'var(--lgc-toolbar-button-text-transform)' as React.CSSProperties['textTransform'],
          }}
        >
          <ArrowLeft size={14} />
          Results
        </button>
      </div>

      <div className="lgc-scroll flex-1 overflow-auto">
        <div className="relative mx-auto max-w-215 px-4 pb-10 pt-5 @md:px-8 @md:pb-16 @md:pt-7">
          {/* Stamp-only postmark decoration in the top-right corner. */}
          <ThemedDecoration theme="stamp">
            <div aria-hidden className="pointer-events-none hidden @md:block">
              <Postmark size={86} rotate={-8} />
            </div>
          </ThemedDecoration>

          {loading && <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>}
          {error && <p className="text-sm text-lgc-error">{error}</p>}
          {data && (
            <WordBody data={data} query={query} onKanjiClick={searchKanji} onAddCard={onAddCard} />
          )}
        </div>
      </div>
    </div>
  );
}

function WordBody({
  data,
  query,
  onKanjiClick,
  onAddCard,
}: {
  data: DetailsResponse;
  query?: string;
  onKanjiClick: (char: string) => void;
  onAddCard?: (word: string, back: string) => void;
}) {
  const { word, kanjis } = data;
  const headword = preferredHeadword(word, query);
  const primaryReading = word.readings[0];
  const reading = primaryReading?.form;
  const engMeanings = word.meanings.filter((m) => m.lang === 'eng');
  const pos = word.meanings[0]?.pos;

  const handleAddCard = () => {
    if (!onAddCard) return;
    const parts: string[] = [];
    if (reading) parts.push(reading);
    if (engMeanings.length > 0) {
      const cappedMeanings = engMeanings.slice(0, MAX_MEANINGS_ON_CARD);
      parts.push(cappedMeanings.map((m, i) => `${i + 1}. ${m.meaning}`).join('\n'));
    }
    onAddCard(headword, parts.join('\n'));
  };

  return (
    <>
      <div className="mb-1.5 flex flex-col gap-3 @lg:flex-row @lg:items-end @lg:gap-6">
        <div
          className="text-[44px] leading-none tracking-tight text-lgc-fg @sm:text-[56px] @lg:text-[72px] @2xl:text-[84px] font-display"
          style={{ letterSpacing: '-0.02em' }}
        >
          {headword}
        </div>
        <div className="flex-1 @lg:pb-3.5">
          {reading && (
            <div
              className="text-[16px] @sm:text-[18px] @lg:text-[22px] font-display"
              style={{ color: 'var(--lgc-row-reading-color)',
                letterSpacing: 'var(--lgc-row-reading-tracking)', }}
            >
              {reading}
            </div>
          )}
          {primaryReading?.pitchAccents && (
            <div className="mt-2">
              <PitchAccentDiagram
                reading={primaryReading.form}
                pitchAccents={primaryReading.pitchAccents}
              />
            </div>
          )}
          {word.readings.length > 1 && (
            <div className="mt-0.5 text-[13px] text-lgc-fg-subtle font-mono">
              {word.readings.map((r) => r.form).join(' · ')}
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1">
            {pos && <span className="lgc-chip">{pos}</span>}
            {word.is_common && <span className="lgc-chip">common</span>}
            {word.jlpt_level != null && <JlptChip level={word.jlpt_level} />}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5 @lg:flex-col @lg:pb-3">
          <button
            type="button"
            onClick={handleAddCard}
            disabled={!onAddCard}
            className="flex items-center gap-1.5 bg-lgc-accent px-3 py-1.5 text-xs font-medium text-lgc-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              borderRadius: 'var(--lgc-button-radius)',
              borderWidth: 'var(--lgc-button-border-width)',
              borderStyle: 'var(--lgc-button-border-style)' as React.CSSProperties['borderStyle'],
              borderColor: 'var(--lgc-button-border-color)',
              boxShadow: 'var(--lgc-button-shadow)',
              fontFamily: 'var(--lgc-button-font-family)',
              letterSpacing: 'var(--lgc-button-letter-spacing)',
              textTransform: 'var(--lgc-button-text-transform)' as React.CSSProperties['textTransform'],
            }}
          >
            <Plus size={13} /> Add to deck
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 border border-lgc-border px-3 py-1.5 text-xs font-medium text-lgc-fg transition-colors hover:bg-lgc-bg-elev"
            style={{ borderRadius: 'var(--lgc-icon-button-radius)' }}
          >
            <Volume2 size={13} /> Play audio
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
            style={{ borderRadius: 'var(--lgc-icon-button-radius)' }}
          >
            <Star size={13} /> Save word
          </button>
        </div>
      </div>

      <SectionHead num="01" title="Meanings" />
      <div className="mb-8">
        {engMeanings.length > 0 ? (
          engMeanings.map((m, i) => (
            <div
              key={`${m.lang}-${i}`}
              className="flex gap-3.5 py-2.5"
              style={{
                borderTopWidth: i > 0 ? '1px' : undefined,
                borderTopStyle: 'var(--lgc-divider-style)' as React.CSSProperties['borderTopStyle'],
                borderTopColor: 'var(--lgc-border)',
                paddingBottom: 'var(--lgc-meaning-padding-bottom)',
              }}
            >
              <div
                className="font-semibold text-lgc-accent"
                style={{
                  fontFamily: 'var(--lgc-meaning-num-font)',
                  fontSize: 'var(--lgc-meaning-num-size)',
                  fontWeight: 'var(--lgc-meaning-num-weight)' as React.CSSProperties['fontWeight'],
                  lineHeight: 'var(--lgc-meaning-num-line-height)',
                  minWidth: 'var(--lgc-meaning-num-min-width)',
                  paddingTop: 'var(--lgc-meaning-num-padding-top)',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1">
                <div className="text-[15px] leading-relaxed text-lgc-fg">{m.meaning}</div>
                {m.pos && <div className="mt-0.5 text-[11px] italic text-lgc-fg-muted">{m.pos}</div>}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-lgc-fg-muted">&mdash;</p>
        )}
      </div>

      {kanjis.length > 0 && (
        <>
          <SectionHead num="02" title="Kanji breakdown" />
          <div className="mb-8 grid grid-cols-1 gap-3 @lg:grid-cols-2">
            {kanjis.map((k) => (
              <button
                key={k.literal}
                type="button"
                onClick={() => onKanjiClick(k.literal)}
                className="lgc-card flex gap-3 p-3 text-left transition-colors hover:bg-lgc-bg-sunken/50 @sm:gap-4 @sm:p-4"
              >
                <div
                  className="flex w-14 shrink-0 items-center justify-center text-[40px] leading-none text-lgc-fg @sm:w-18 @sm:border-r @sm:border-lgc-border @sm:pr-3 @sm:text-[56px] @lg:w-22 @lg:text-[72px] font-display"
                >
                  {k.literal}
                </div>
                <div className="flex-1 text-[12.5px] leading-relaxed">
                  <div
                    className="mb-1 font-medium font-display"
                    style={{ color: 'var(--lgc-kanji-meanings-color)',
                      fontSize: 'var(--lgc-kanji-meanings-size)', }}
                  >
                    {k.meanings.join(', ') || '—'}
                  </div>
                  <InfoRow label="On" value={k.on_readings.join('、') || '—'} jp />
                  <InfoRow label="Kun" value={k.kun_readings.join('、') || '—'} jp />
                  <InfoRow label="Strokes" value={String(k.stroke_count ?? '—')} />
                  <InfoRow label="Grade" value={k.grade != null ? String(k.grade) : '—'} />
                  <InfoRow label="JLPT" value={k.jlpt_level != null ? `N${k.jlpt_level}` : '—'} />
                  <InfoRow label="Radical" value={k.radical != null ? String(k.radical) : '—'} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {data.sentences.length > 0 && (
        <>
          <SectionHead num={kanjis.length > 0 ? '03' : '02'} title="Examples" />
          <div className="mb-8 flex flex-col gap-4">
            {data.sentences.map((s) => (
              <div key={s.id} className="lgc-card p-4">
                {s.jaRuby ? (
                  <div
                    className="text-[17px] leading-relaxed text-lgc-fg font-display"
                    // The HTML originates from our curated import of Kanjium's
                    // sentences.txt — fixed format with only <ruby>/<rb>/<rp>/<rt>
                    // tags. No user content reaches this branch.
                    dangerouslySetInnerHTML={{ __html: s.jaRuby }}
                  />
                ) : (
                  <div className="text-[17px] leading-relaxed text-lgc-fg font-display">
                    {s.ja}
                  </div>
                )}
                <div className="mt-1.5 text-[13px] text-lgc-fg-muted">{s.en}</div>
                {s.gradeLabel && (
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-lgc-fg-subtle font-mono">
                    {s.gradeLabel}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex justify-end gap-1.5 text-[11px] text-lgc-fg-subtle">
        Source &middot; JMdict {data.sentences.length > 0 && '· Tatoeba (via Kanjium)'}
      </div>
    </>
  );
}
