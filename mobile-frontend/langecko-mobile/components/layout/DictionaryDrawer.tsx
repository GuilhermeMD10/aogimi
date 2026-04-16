import { useEffect, useMemo, useRef } from 'react';
import { Animated, Keyboard, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useDictionaryDrawer } from './DictionaryDrawerContext';
import { DictionaryScreen } from '@/components/dictionary/DictionaryScreen';
import { WordDetailPanel } from '@/components/dictionary/WordDetailPanel';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { radius } from '@/theme/tokens';

// ── Configuration ────────────────────────────────────────────────────────────

export type DrawerMode = 'bottom-sheet' | 'right-drawer';

const DRAWER_MODE: DrawerMode = 'bottom-sheet';

/** Bottom-sheet: fraction of screen height. */
const SHEET_HEIGHT_RATIO = 0.5;
/** Right-drawer: visible sliver of the underlying screen on the left. */
const PEEK = 56;

/** Drag distance / velocity thresholds to commit a close. */
const CLOSE_RATIO = 0.28;
const CLOSE_VELOCITY = 0.5;

const SPRING = { tension: 140, friction: 18, useNativeDriver: true } as const;

// ── Component ────────────────────────────────────────────────────────────────

export function DictionaryDrawer() {
  const { isOpen, close, seedQuery, seedToken, view, wordId, goToWord, goToSearch } = useDictionaryDrawer();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const styles = useThemedStyles(createStyles);

  const isBottom = DRAWER_MODE === 'bottom-sheet';

  const sheetHeight = Math.round(screenHeight * SHEET_HEIGHT_RATIO);
  const drawerWidth = screenWidth - PEEK;
  const travel = isBottom ? sheetHeight : drawerWidth;
  const paneWidth = isBottom ? screenWidth : drawerWidth;

  // ── Outer translate: open/close ────────────────────────────────────────────
  const translate = useRef(new Animated.Value(travel)).current;

  useEffect(() => {
    Animated.spring(translate, { ...SPRING, toValue: isOpen ? 0 : travel }).start();
  }, [isOpen, travel, translate]);

  // ── Inner translate: search ↔ detail pane ──────────────────────────────────
  const paneTranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(paneTranslateX, {
      ...SPRING,
      toValue: view === 'word' ? -paneWidth : 0,
    }).start();
  }, [view, paneWidth, paneTranslateX]);

  const requestClose = () => {
    Keyboard.dismiss();
    close();
  };

  // ── Pan-to-dismiss ─────────────────────────────────────────────────────────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          isBottom
            ? g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5
            : g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => {
          const delta = isBottom ? g.dy : g.dx;
          translate.setValue(Math.max(0, Math.min(travel, delta)));
        },
        onPanResponderRelease: (_, g) => {
          const delta = isBottom ? g.dy : g.dx;
          const velocity = isBottom ? g.vy : g.vx;
          const shouldClose = delta > travel * CLOSE_RATIO || velocity > CLOSE_VELOCITY;
          if (shouldClose) {
            Animated.timing(translate, {
              toValue: travel,
              duration: 220,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) requestClose();
            });
          } else {
            Animated.spring(translate, { ...SPRING, toValue: 0 }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translate, { ...SPRING, toValue: isOpen ? 0 : travel }).start();
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }),
    [travel, isBottom],
  );

  const backdropOpacity = translate.interpolate({
    inputRange: [0, travel],
    outputRange: [0.45, 0],
    extrapolate: 'clamp',
  });

  // ── Shared pane content ────────────────────────────────────────────────────
  const panes = (
    <Animated.View
      style={[
        styles.panes,
        {
          width: paneWidth * 2,
          transform: [{ translateX: paneTranslateX }],
        },
      ]}
    >
      <View style={{ width: paneWidth }}>
        <DictionaryScreen seedQuery={seedQuery} seedToken={seedToken} onWordPress={goToWord} />
      </View>
      <View style={{ width: paneWidth }}>
        {wordId ? (
          <WordDetailPanel id={wordId} onBack={() => goToSearch()} onKanjiPress={(char) => goToSearch(char)} />
        ) : null}
      </View>
    </Animated.View>
  );

  // ── Bottom-sheet layout ────────────────────────────────────────────────────
  if (isBottom) {
    return (
      <View style={styles.root} pointerEvents={isOpen ? 'auto' : 'none'}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="none" />
        <Pressable style={[styles.backdropTap, { height: screenHeight - sheetHeight }]} onPress={requestClose} />

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheetBottom,
            {
              top: screenHeight - sheetHeight,
              height: sheetHeight,
              width: screenWidth,
              transform: [{ translateY: translate }],
            },
          ]}
        >
          <View style={styles.grabHandleBottom} pointerEvents="none" />
          {panes}
        </Animated.View>
      </View>
    );
  }

  // ── Right-drawer layout ────────────────────────────────────────────────────
  return (
    <View style={styles.root} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="none" />
      <Pressable style={[styles.peek, { width: PEEK }]} onPress={requestClose} />

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.sheetRight, { left: PEEK, width: drawerWidth, transform: [{ translateX: translate }] }]}
      >
        {panes}
        <View style={styles.grabHandleRight} pointerEvents="none" />
      </Animated.View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (c: Colors) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 100,
      elevation: 100,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.shadow,
    },
    backdropTap: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
    },
    peek: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
    },
    sheetBottom: {
      position: 'absolute',
      left: 0,
      backgroundColor: c.bgBase,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      shadowColor: c.shadow,
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: -4 },
      shadowRadius: 18,
      elevation: 18,
      overflow: 'hidden',
    },
    sheetRight: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      backgroundColor: c.bgBase,
      borderTopLeftRadius: radius.xl,
      borderBottomLeftRadius: radius.xl,
      shadowColor: c.shadow,
      shadowOpacity: 0.2,
      shadowOffset: { width: -6, height: 0 },
      shadowRadius: 18,
      elevation: 18,
      overflow: 'hidden',
    },
    panes: {
      flex: 1,
      flexDirection: 'row',
    },
    grabHandleBottom: {
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 4,
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      opacity: 0.8,
    },
    grabHandleRight: {
      position: 'absolute',
      left: 6,
      top: '50%',
      marginTop: -24,
      width: 4,
      height: 48,
      borderRadius: 2,
      backgroundColor: c.border,
      opacity: 0.8,
    },
  });
