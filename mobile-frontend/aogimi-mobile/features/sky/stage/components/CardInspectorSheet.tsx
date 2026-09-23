import { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, IconButton } from '@/shared/components';
import {
  usePalette,
  ACCELERATE,
  DECELERATE,
  SHEET_MS,
  SURFACE_MS,
  radius,
  spacing,
  type Palette,
} from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import { useReduceMotion } from '@/lib/useReduceMotion';
import type { LocalCard } from '../types';
import { CardInspectorBody, CardTags } from './CardInspectorBody';

/** DESIGN.md's grabber: 40 × 4. The sheet holds at most 42% of the screen. */
const GRABBER_W = 40;
const GRABBER_H = 4;
const MAX_HEIGHT_RATIO = 0.42;

// Swipe-to-dismiss tuning, the same figures as `BottomSheet`'s.
const SWIPE_CLOSE_VELOCITY = 0.6;
const SWIPE_CLOSE_DISTANCE = 72;

/**
 * The ringed star's card — `SkyInspector.dc.html`'s sheet, **docked, not
 * modal.** The shared `BottomSheet` renders in a `Modal` over a scrim, which is
 * right for a form you have to finish and wrong here: the whole point of the
 * focused tier is that you can see the star you selected. A scrim would black
 * out the sky the sheet is describing, and a modal would swallow the pan and
 * pinch that still belong to the camera. So this is an ordinary absolutely
 * positioned pane in the sheet's own material, and the view's `insets` shrink
 * the camera's fit by its measured height so the ringed star is never under it.
 *
 * It rises like a sheet and leaves like one — the exit is the rise played
 * backwards, over `ACCELERATE`. A drag down on the grabber tracks the finger and
 * dismisses past the threshold. Tapping empty sky and Android back close it too
 * — the tier walk treats a selected card as one level in.
 *
 * Because the pane is mount-gated by its host rather than being a `Modal`, the
 * host has to keep it mounted for the length of the exit: it passes `visible`
 * and unmounts on `onExited`. See `SkyStageView`'s docked card.
 *
 * The content scrolls inside a height cap, so a card with three glosses and a
 * long sentence cannot grow the sheet past the sky it describes. The actions
 * are the top row's two circles: the dictionary, and `…`, which holds delete.
 */
export function CardInspectorSheet({
  card,
  visible,
  onExited,
  onClose,
  onMore,
  onLookUp,
}: {
  card: LocalCard;
  /** False starts the exit. The host keeps the pane mounted until `onExited`. */
  visible: boolean;
  onExited: () => void;
  onClose: () => void;
  /** Opens the card's menu — the stage hosts it, because a `Modal` mounted in
   *  here would present from this pane's view controller and fight the camera. */
  onMore: () => void;
  onLookUp: () => void;
}) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const rise = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        rise.setValue(1);
        return;
      }
      const anim = Animated.timing(rise, {
        toValue: 1,
        duration: SHEET_MS,
        easing: DECELERATE,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    }

    if (reduceMotion) {
      onExited();
      return;
    }
    // `drag` is left where the finger put it, so a swipe-dismiss carries on
    // downwards from there instead of restarting the trip from rest.
    const anim = Animated.timing(rise, {
      toValue: 0,
      duration: SHEET_MS,
      easing: ACCELERATE,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onExited();
    });
    return () => anim.stop();
  }, [visible, rise, reduceMotion, onExited]);

  // A new card in the same sheet: snap the drag back, keep the pane up.
  useEffect(() => {
    drag.setValue(0);
  }, [card.id, drag]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 4 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => drag.setValue(Math.max(0, gs.dy)),
      onPanResponderRelease: (_, gs) => {
        if (gs.vy > SWIPE_CLOSE_VELOCITY || gs.dy > SWIPE_CLOSE_DISTANCE) {
          onClose();
          return;
        }
        Animated.timing(drag, {
          toValue: 0,
          duration: SURFACE_MS,
          easing: DECELERATE,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const translateY = useMemo(
    () => Animated.add(rise.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }), drag),
    [rise, drag],
  );

  return (
    // A leaving pane is not a target — its buttons would still take a tap.
    <Animated.View
      style={{ transform: [{ translateY }], opacity: rise }}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      <Glass
        material="sheet"
        radius={radius.sheet}
        style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <View style={s.grabberWrap} {...pan.panHandlers}>
          <View style={[s.grabber, s.grabberFill]} />
        </View>

        <ScrollView
          style={{ maxHeight: Math.round(screenH * MAX_HEIGHT_RATIO) }}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.topRow}>
            <CardTags card={card} />
            <View style={s.actions}>
              <IconButton
                icon="book-open"
                size={36}
                onPress={onLookUp}
                accessibilityLabel={t('sky.lookUp')}
              />
              <IconButton glyph="more" size={36} onPress={onMore} accessibilityLabel={t('sky.cardMenu')} />
            </View>
          </View>

          <CardInspectorBody card={card} />
        </ScrollView>
      </Glass>
    </Animated.View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        sheet: {
          // A sheet's radius on the top corners only — it grows out of the
          // bottom edge, so the bottom corners are off-screen by design.
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          // And no edge at all: `Glass` draws a hairline and a specular rim to
          // lift a pane off the canvas, which a sheet does not need — it is
          // already separated from what is under it. Same call as the shared
          // `BottomSheet`'s, so the two shells still read as one surface.
          borderWidth: 0,
        },
        grabberWrap: { paddingTop: spacing.md, paddingBottom: spacing.sm, alignItems: 'center' },
        grabber: { width: GRABBER_W, height: GRABBER_H, borderRadius: GRABBER_H },
        content: { paddingHorizontal: spacing.screenX, paddingBottom: spacing.sm, gap: spacing.md },
        topRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        },
        actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        grabberFill: { backgroundColor: p.bdA },
      }),
    [p],
  );
}
