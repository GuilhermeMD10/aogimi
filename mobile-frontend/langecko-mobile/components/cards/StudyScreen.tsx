import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { Deck } from '@/lib/types';
import { useStudySession } from './useStudySession';

interface StudyScreenProps {
  deck: Deck;
  onExit: () => void;
}

/** Gesture thresholds for swipe-to-advance. Kept in sync with the card's
 *  horizontal translate animation below. */
const SWIPE_THRESHOLD   = 100;
const SWIPE_VELOCITY    = 0.5;
const FLIP_DURATION     = 320;
const ADVANCE_DURATION  = 220;

export function StudyScreen({ deck, onExit }: StudyScreenProps) {
  const styles = useThemedStyles(createStyles);
  const session = useStudySession(deck.cards);
  const { width } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Button label="✕ Exit" onPress={onExit} />
        <Text style={styles.counter}>
          {session.finished
            ? `${session.total} / ${session.total}`
            : `${session.index + 1} / ${session.total}`}
        </Text>
        <Button label="Shuffle" onPress={session.restart} style={styles.topBarRight} />
      </View>

      <ProgressBar
        value={Math.min(session.index, session.total)}
        total={session.total}
        styles={styles}
      />

      <View style={styles.stage}>
        {session.finished ? (
          <FinishedCard onRestart={session.restart} onExit={onExit} styles={styles} />
        ) : session.current ? (
          <FlipCard
            // keying on card id resets the flip state for each new card.
            key={session.current.id}
            front={session.current.front}
            back={session.current.back}
            stageWidth={width}
            onAdvance={session.next}
            styles={styles}
          />
        ) : null}
      </View>

      {!session.finished ? (
        <View style={styles.controls}>
          <Button
            label="← Previous"
            onPress={session.previous}
            disabled={session.index === 0}
          />
          <Button
            label={session.index === session.total - 1 ? 'Finish' : 'Next →'}
            variant="primary"
            onPress={session.next}
            style={styles.nextBtn}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Thin horizontal bar representing study progress. Matches the study
 *  counter so the two read together. */
function ProgressBar({ value, total, styles }: { value: number; total: number; styles: ReturnType<typeof createStyles> }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

interface FlipCardProps {
  front: string;
  back: string;
  stageWidth: number;
  onAdvance: () => void;
  styles: ReturnType<typeof createStyles>;
}

/**
 * Tap-to-flip card with a horizontal swipe-left gesture that advances to the
 * next card. Uses a shared `rotation` Animated.Value: 0° front, 180° back.
 * Both faces render stacked in the same Animated.View and each rotates by
 * an offset so the backface appears upright when revealed.
 */
function FlipCard({ front, back, stageWidth, onAdvance, styles }: FlipCardProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const dragX    = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  const flip = useCallback(() => {
    const target = flipped ? 0 : 180;
    Animated.timing(rotation, {
      toValue: target,
      duration: FLIP_DURATION,
      useNativeDriver: true,
    }).start();
    setFlipped((v) => !v);
  }, [flipped, rotation]);

  // Fly the card off-screen to the left, then advance. The parent re-keys on
  // card id so the new card renders at rest on mount.
  const swipeAway = useCallback(() => {
    Animated.timing(dragX, {
      toValue: -stageWidth,
      duration: ADVANCE_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onAdvance();
    });
  }, [dragX, stageWidth, onAdvance]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        // Only claim predominantly-horizontal drags; vertical scrolls (none
        // here today, but future-proof) and taps stay with the Pressable.
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          // Only allow dragging leftward (advance direction). Small rightward
          // rubber-band feels natural but isn't worth the code.
          if (g.dx <= 0) dragX.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const shouldAdvance =
            g.dx < -SWIPE_THRESHOLD || g.vx < -SWIPE_VELOCITY;
          if (shouldAdvance) {
            swipeAway();
          } else {
            Animated.spring(dragX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 160,
              friction: 20,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dragX, swipeAway],
  );

  const frontRotate = rotation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = rotation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  // Fade the trailing face out as the card rotates past 90° so we don't
  // see the "wrong" side through the other one on platforms without
  // backface-visibility support.
  const frontOpacity = rotation.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = rotation.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [0, 0, 1, 1],
  });

  // Subtle tilt + opacity while the user drags the card left.
  const dragRotate = dragX.interpolate({
    inputRange: [-stageWidth, 0],
    outputRange: ['-12deg', '0deg'],
    extrapolate: 'clamp',
  });
  const dragOpacity = dragX.interpolate({
    inputRange: [-stageWidth, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.flipOuter,
        {
          opacity: dragOpacity,
          transform: [{ translateX: dragX }, { rotate: dragRotate }],
        },
      ]}
    >
      <Pressable
        onPress={flip}
        accessibilityRole="button"
        accessibilityLabel={flipped ? 'Show front' : 'Show back'}
        style={styles.flipPressable}
      >
        <Animated.View
          style={[
            styles.face,
            styles.faceFront,
            { opacity: frontOpacity, transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
          ]}
        >
          <Text style={styles.faceLabel}>FRONT</Text>
          <Text style={styles.faceText}>{front}</Text>
          <Text style={styles.hint}>Tap to flip · swipe left for next</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.face,
            styles.faceBack,
            { opacity: backOpacity, transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
          ]}
        >
          <Text style={styles.faceLabel}>BACK</Text>
          <Text style={styles.faceText}>{back}</Text>
          <Text style={styles.hint}>Tap to flip back</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function FinishedCard({ onRestart, onExit, styles }: { onRestart: () => void; onExit: () => void; styles: ReturnType<typeof createStyles> }) {
  // Tiny entrance fade so it doesn't pop in jarringly after the swipe.
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.finished, { opacity }]}>
      <Text style={styles.finishedTitle}>All done!</Text>
      <Text style={styles.finishedSubtitle}>
        You've gone through every card. Shuffle to run through them again.
      </Text>
      <View style={styles.finishedActions}>
        <Button label="Shuffle again" variant="primary" onPress={onRestart} />
        <Button label="Exit" onPress={onExit} />
      </View>
    </Animated.View>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topBarRight: { marginLeft: 'auto' },
  counter: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: c.textSecondary,
    letterSpacing: 0.5,
  },

  progressTrack: {
    marginTop: spacing.sm,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.accent,
  },

  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },

  flipOuter: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: '100%',
  },
  flipPressable: { flex: 1 },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    // Modern card elevation.
    shadowColor: c.shadow,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  faceFront: {
    backgroundColor: c.bgSurface,
  },
  faceBack: {
    backgroundColor: c.accentSoft,
  },
  faceLabel: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: c.textSecondary,
  },
  faceText: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: c.textPrimary,
    textAlign: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: spacing.md,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },

  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  nextBtn: { flex: 1 },

  finished: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  finishedTitle: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.serifSemiBold,
    color: c.textPrimary,
  },
  finishedSubtitle: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
  },
  finishedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
