import { Fragment, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { MeaningRow } from '@/shared/components/MeaningRow';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { radius, spacing, type, type Palette } from '@/theme/tokens';
import type { CardRecord } from '../../stage/types';
import type { DisplayPrefs } from '../types';
import { cloze } from '../lib/clozeContext';

/** DESIGN.md's 48×1 rule under a headword. */
const DIVIDER_W = 48;

type Props = {
  card: CardRecord;
  prefs: DisplayPrefs;
  deckName: string;
  side: 'front' | 'back';
};

/**
 * What the flashcard says — `Study.dc.html`'s two faces, under the user's
 * display preferences.
 *
 * One component rather than a `CardFront` and a `CardBack`, unchanged from
 * before and for the same reason: the context-sentence slot reads one field on
 * both faces — clozed on the front, lit on the back — so splitting it would
 * either duplicate the slot or make the parent coordinate it.
 *
 * ── The preferences outrank the composition ────────────────────────────────
 * The handoff draws one card: eyebrow, headword, divider, hint on the front;
 * headword, reading, three meanings, a sentence on the back. The app has four
 * presets and four toggles that decide which of those appear, and `production`
 * turns the card around entirely — meaning on the front, kanji on the back.
 * A redesign restyles; it does not quietly delete a feature. So every slot
 * below is the composition's, and every *gate* on a slot is the one that was
 * already there.
 *
 * ── The eyebrow is the deck name ───────────────────────────────────────────
 * The composition's eyebrow is a part of speech (`VERB · 一段`) and nothing on
 * a `cards` row records one. The owner's ruling for this slot is the deck
 * name, dropped when there isn't one — which is exactly what the existing
 * `front.deckName` toggle already governed, so the toggle keeps the slot and
 * the slot keeps the toggle's default. In a cross-deck session there is no
 * single deck, `deckName` arrives empty, and the eyebrow is simply absent.
 *
 * ── Not drawn, for want of the data ────────────────────────────────────────
 *   · **part of speech** — see above;
 *   · **the source line** (`星の王子さま · ch. 3`) — a card records the
 *     sentence it came from but not the book or the chapter;
 *   · **the example translation** — `context_sentence` stores the Japanese
 *     alone.
 * The same three the star inspector goes without, for the same reasons.
 */
export function CardBody({ card, prefs, deckName, side }: Props) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);

  const isFront = side === 'front';
  const showEyebrow = prefs.front.deckName && deckName.length > 0;

  // Cards created before migration 026 carry their glosses inside `back`
  // instead, which is why this falls back rather than showing an empty block.
  const meanings = card.meanings.length > 0 ? card.meanings : null;

  const eyebrow = showEyebrow ? (
    <Text style={s.eyebrow} numberOfLines={1}>
      {deckName}
    </Text>
  ) : null;

  const headword = (
    <Text style={s.headword} numberOfLines={3}>
      {card.front}
    </Text>
  );

  const divider = <View style={s.divider} />;

  // ── production: the card is reversed ─────────────────────────────────────
  // Front is the meaning alone; the kanji, its reading and the sentence all
  // wait on the back. The front-side toggles other than `deckName` have
  // nothing to act on here — a reading or a cloze makes no sense on a face
  // that carries no Japanese — which is why this branch reads only `deckName`
  // and `back.exampleSentence`.
  if (prefs.preset === 'production') {
    return isFront ? (
      <View style={s.centred}>
        {eyebrow}
        <Text style={s.meaningSolo}>{card.back}</Text>
      </View>
    ) : (
      <View style={s.stack}>
        <View style={s.head}>
          {eyebrow}
          {headword}
          <Reading card={card} style={s.reading} />
          {divider}
        </View>
        <Context card={card} prefs={prefs} s={s} />
      </View>
    );
  }

  // ── every other preset: kanji on the front, the answer on the back ───────
  if (isFront) {
    const clozed = prefs.front.context && card.context_sentence.length > 0;
    return (
      <View style={s.centred}>
        {eyebrow}
        {headword}
        {prefs.front.reading && <Reading card={card} style={s.reading} />}
        {divider}
        {clozed ? (
          <Text style={s.contextCentred}>{cloze(card.context_sentence, card.front)}</Text>
        ) : (
          <Text style={s.hint}>{t('study.revealHint')}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={s.stack}>
      <View style={s.head}>
        {eyebrow}
        {headword}
        {/* The reading joins the back whenever the front did not already
            carry it — the one slot whose *placement*, not presence, the
            toggle decides. */}
        <Reading card={card} style={s.reading} />
        {divider}
      </View>

      {meanings ? (
        <View style={s.meanings}>
          {meanings.map((m, i) => (
            <MeaningRow key={`${m}-${i}`} index={i + 1} text={m} />
          ))}
        </View>
      ) : (
        card.back.length > 0 && <Text style={s.meaningSolo}>{card.back}</Text>
      )}

      <Context card={card} prefs={prefs} s={s} />
    </View>
  );
}

/** `[あおぎみる]`, in accent. Absent when the card has no reading. */
function Reading({ card, style }: { card: CardRecord; style: StyleProp<TextStyle> }) {
  if (card.reading.length === 0) return null;
  return (
    <Text style={style} numberOfLines={2}>
      {`[${card.reading}]`}
    </Text>
  );
}

/**
 * The sentence the card came from, with every occurrence of the headword lit.
 *
 * Split on the exact surface string the card carries: for a card started from
 * the reader that is what was highlighted, so it is in the sentence by
 * construction. A card whose sentence does not contain it renders as one
 * unlit run, which is the honest outcome — the same treatment the star
 * inspector gives it.
 */
function Context({
  card,
  prefs,
  s,
}: {
  card: CardRecord;
  prefs: DisplayPrefs;
  s: ReturnType<typeof useStyles>;
}) {
  if (!prefs.back.exampleSentence || card.context_sentence.length === 0) return null;
  const parts =
    card.front.length > 0 ? card.context_sentence.split(card.front) : [card.context_sentence];

  return (
    <Text style={s.context}>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && <Text style={s.lit}>{card.front}</Text>}
        </Fragment>
      ))}
    </Text>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        /** The front, and the back's head block: centred, DESIGN.md's 18pt
         *  rhythm between the card's own blocks. */
        centred: { alignItems: 'center', gap: spacing.lg + 2 },
        /** The back's blocks, which run the card's width. */
        stack: { gap: spacing.lg + 2 },
        /** Tighter inside the head block — the four lines are one object. */
        head: { alignItems: 'center', gap: spacing.sm + 2 },

        eyebrow: { ...type.eyebrow, color: p.accent, textTransform: 'uppercase' },
        headword: { ...type.displayKanjiMobile, color: p.ink, textAlign: 'center' },
        reading: { ...type.titleReading, color: p.accent, textAlign: 'center' },
        divider: { width: DIVIDER_W, height: 1, backgroundColor: p.glassBorder },

        hint: { ...type.caption, color: p.faint, textAlign: 'center' },

        meanings: { gap: 6 },
        /** The pre-026 fallback, and `production`'s whole front face. */
        meaningSolo: { ...type.titleMeaning, color: p.ink, textAlign: 'center' },

        /** 15px JP at 1.7, DESIGN.md's example-sentence line. */
        context: { ...type.titleReading, fontSize: 15, lineHeight: 26, color: p.ink },
        contextCentred: {
          ...type.titleReading,
          fontSize: 15,
          lineHeight: 26,
          color: p.muted,
          textAlign: 'center',
        },
        /** DESIGN.md draws the mark at radius 4; the scale's nearest step is
         *  `chip` at 6, which on a 15px line is the same corner. */
        lit: { backgroundColor: p.highlight, borderRadius: radius.chip },
      }),
    [p],
  );
}
