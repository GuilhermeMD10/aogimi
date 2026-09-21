import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Glass } from '@/shared/components/Glass';
import { IconButton } from '@/shared/components/IconButton';
import { Touchable } from '@/shared/components/Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { EASE, FLIP_MS } from '@/theme/motion';
import { radius, spacing } from '@/theme/tokens';
import { CardBody } from './CardBody';
import type { CardRecord } from '../../stage/types';
import type { DisplayPrefs } from '../types';

/** The dictionary circle's inset from the card's top-right corner. */
const INSET = spacing.lg;

/**
 * **The flashcard** — `Study.dc.html`'s radius-36 pane, the one surface in the
 * app that uses `radius.studyCard`.
 *
 * Tier 2's fill with a live blur behind it: see `Glass`'s `blur` prop for why
 * the tier is not simply raised to 3. It is the only glass on the screen, so
 * it can afford the backdrop filter that a list of cards could not.
 *
 * ── One size, both faces ──────────────────────────────────────────────────
 * The card fills its area and does not change size when it turns — the
 * owner's instruction, and the thing the composition's own figures cannot
 * give you. It draws the front at a 420pt minimum and lets the back grow to
 * its content, which means the pane resizes under the reader's thumb at the
 * exact moment their attention is on it.
 *
 * So the height comes from the area instead, the area is constant (see
 * `FOOTER_H` in `StudyScreen`), and the content scrolls *inside* the pane when
 * a long back outruns it. `flexGrow` with `justifyContent: 'center'` is what
 * gives both behaviours from one style: centred while it fits, scrolling from
 * the top once it does not.
 *
 * The trade-off is that at the composition's own 390×844 the card is taller
 * than the 420 drawn, because it now takes the whole flexible region the
 * handoff set aside for it. Capping it and centring instead is a one-line
 * change if the drawn proportions matter more.
 *
 * ── The turn is a crossfade ────────────────────────────────────────────────
 * `side` changes the instant the user reveals, but the *content* lags a half
 * beat: it fades out, swaps, and fades back in over `FLIP_MS`. A rotation was
 * the other option and is the wrong one here — the back is taller than the
 * front, so the card would have to resize while edge-on, which reads as a
 * glitch rather than as a turn. See `FLIP_MS`.
 *
 * Under the OS's reduce-motion switch the swap is immediate, the same way
 * `Touchable` drops its nudge.
 */
export function StudyCard({
  card,
  prefs,
  deckName,
  side,
  onFlip,
  onLookUp,
}: {
  card: CardRecord;
  prefs: DisplayPrefs;
  deckName: string;
  side: 'front' | 'back';
  /** Tapping the card turns it — the composition's second way to reveal. */
  onFlip: () => void;
  /** Opens the dictionary entry for this card's headword. */
  onLookUp: () => void;
}) {
  const p = usePalette();
  const t = useT();
  const reduceMotion = useReduceMotion();

  // What is *drawn*, which trails `side` by the fade-out. Kept in state rather
  // than derived so the outgoing face stays mounted while it fades.
  const [shown, setShown] = useState(side);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (side === shown) return;
    if (reduceMotion) {
      setShown(side);
      return;
    }
    const half = FLIP_MS / 2;
    const out = Animated.timing(fade, {
      toValue: 0,
      duration: half,
      easing: EASE,
      useNativeDriver: true,
    });
    out.start(({ finished }) => {
      if (!finished) return;
      setShown(side);
      Animated.timing(fade, {
        toValue: 1,
        duration: half,
        easing: EASE,
        useNativeDriver: true,
      }).start();
    });
    return () => out.stop();
    // `shown` is the trailing value this effect sets; depending on it would
    // re-enter the moment the swap lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, reduceMotion, fade]);

  // A card whose fade was interrupted mid-turn (a grade landing during the
  // animation) would otherwise stay part-transparent for good.
  useEffect(() => {
    if (side === shown) fade.setValue(1);
  }, [side, shown, fade]);

  const isBack = shown === 'back';

  return (
    <Touchable
      onPress={onFlip}
      accessibilityRole="button"
      accessibilityLabel={t(isBack ? 'study.showFront' : 'study.revealCard')}
      minTarget={false}
      nudge={false}
      radius={radius.studyCard}
      style={styles.fill}
    >
      <Glass tier={2} blur radius={radius.studyCard} style={styles.card}>
        <Animated.View style={[styles.body, { opacity: fade }]}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <CardBody card={card} prefs={prefs} deckName={deckName} side={shown} />
          </ScrollView>
        </Animated.View>

        {/* Back only. The entry this opens *is* the answer, so offering it on
            the front would hand the card away rather than look it up — the
            composition draws the circle on both faces and this is the one
            place the existing behaviour is kept over it. */}
        {isBack && (
          <View style={styles.dict}>
            <IconButton
              icon="search"
              size={36}
              tier={1}
              tone={p.accent}
              onPress={onLookUp}
              accessibilityLabel={t('study.lookUp')}
            />
          </View>
        )}
      </Glass>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: { flex: 1 },
  body: { flex: 1 },
  /** DESIGN.md's `36px 28px 28px`. On the content container rather than the
   *  pane, so a scrolled back keeps its padding at both ends instead of
   *  running under the pane's edge. */
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  dict: { position: 'absolute', top: INSET, right: INSET },
});
