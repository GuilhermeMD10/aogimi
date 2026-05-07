import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useColors, useFonts } from '@/theme/ThemeContext';
import type { ThemeColors, ThemeFonts } from '@/theme/tokens';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const ICONS: Record<string, FeatherName> = {
  reader: 'book-open',
  dictionary: 'search',
  decks: 'layers',
  profile: 'user',
};

const FALLBACK_LABELS: Record<string, string> = {
  reader: 'Read',
  dictionary: 'Dict',
  decks: 'Decks',
  profile: 'You',
};

// Total duration is split in two phases via interpolate input-ranges:
//   0.0 → 0.5  ·  outgoing tab shrinks + label fades to 0
//   0.5 → 1.0  ·  incoming tab expands + label fades 0 → 1
// Strictly sequential — the two phases never overlap, eliminating the
// "two labels visible at once" flicker the previous version had.
const ANIM_DURATION = 250;
const SHRINK_END = 0.3;
const EXPAND_START = 0.6;

/**
 * Stamp-theme bottom tab bar.
 *
 * Composition (per Stamp Agent Handoff §03 / DS Components):
 *  - Rectangular pill, paper bg, 1.5px sumi border, 3px hard offset shadow.
 *  - 18dp + safe-area-bottom from the screen edge.
 *  - Active tab = rectangular vermillion box around icon + uppercase label.
 *  - Sibling tabs: ash icons + label collapsed (icon-only).
 */
export function PillNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const fonts = useFonts();
  const insets = useSafeAreaInsets();

  const progress = useRef(new Animated.Value(1)).current;
  const [prevIndex, setPrevIndex] = useState(state.index);

  useLayoutEffect(() => {
    if (prevIndex === state.index) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: ANIM_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setPrevIndex(state.index);
    });
  }, [state.index, prevIndex, progress]);

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: 18 + insets.bottom }]}>
      {/* Hard offset shadow on a parent so the rectangular pill's overflow
          doesn't clip it. */}
      <View
        style={{
          shadowColor: colors.fg,
          shadowOffset: { width: 3, height: 3 },
          shadowOpacity: 1,
          shadowRadius: 0,
        }}
      >
        <View
          style={[
            styles.pill,
            {
              backgroundColor: colors.bgElev,
              borderColor: colors.fg,
            },
          ]}
        >
          {state.routes.map((route, idx) => {
            const iconName = ICONS[route.name];
            if (!iconName) return null;

            const active = state.index === idx;
            const descriptor = descriptors[route.key];
            const labelOpt = descriptor?.options.tabBarLabel;
            const label =
              typeof labelOpt === 'string'
                ? labelOpt
                : (descriptor?.options.title ?? FALLBACK_LABELS[route.name] ?? route.name);

            // Per-tab phase: outgoing tab is "live" in 0..0.5, incoming in 0.5..1.
            // For tabs that are neither, expansion stays at 0 the whole time.
            // For the steady-state case (no transition in flight), the active
            // tab sits at expansion = 1.
            const isIncoming = idx === state.index;
            const isOutgoing = idx === prevIndex && idx !== state.index;

            let expansion: Animated.AnimatedInterpolation<number>;
            if (isIncoming) {
              // Stay collapsed during the shrink phase, then expand in the
              // back half. Settles to 1 when progress reaches 1.
              expansion = progress.interpolate({
                inputRange: [0, EXPAND_START, 1],
                outputRange: [0, 0, 1],
              });
            } else if (isOutgoing) {
              // Start fully expanded, shrink in the front half, stay collapsed.
              expansion = progress.interpolate({
                inputRange: [0, SHRINK_END, 1],
                outputRange: [1, 0, 0],
              });
            } else {
              expansion = progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0],
              });
            }

            return (
              <StampTab
                key={route.key}
                label={label}
                iconName={iconName}
                expansion={expansion}
                active={active}
                colors={colors}
                fonts={fonts}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!active && !event.defaultPrevented) {
                    navigation.navigate(route.name as never);
                  }
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab — vermillion box on activation, mono caps label slides + fades in
// ─────────────────────────────────────────────────────────────────────────────

function StampTab({
  label,
  iconName,
  expansion,
  active,
  colors,
  fonts,
  onPress,
}: {
  label: string;
  iconName: FeatherName;
  /** 0 = collapsed (icon only) · 1 = fully expanded (vermillion box + label) */
  expansion: Animated.AnimatedInterpolation<number>;
  active: boolean;
  colors: ThemeColors;
  fonts: ThemeFonts;
  onPress: () => void;
}) {
  // Geometry follows expansion linearly — paddings + label space.
  const paddingLeft = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 12],
  });
  const paddingRight = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 14],
  });
  const labelMaxWidth = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 130],
  });
  const labelMargin = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });
  const bgColor = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', colors.accent],
  });
  // Icon: ash when collapsed, paper when expanded — crossfade.
  const inactiveIconOpacity = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={4}
    >
      <Animated.View
        style={[
          styles.btn,
          {
            paddingLeft,
            paddingRight,
            backgroundColor: bgColor,
          },
        ]}
      >
        {/* Two icons crossfaded — Feather's color prop isn't animatable. */}
        <View style={styles.iconWrap}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: inactiveIconOpacity }]}>
            <Feather name={iconName} size={20} color={colors.fgMuted} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: expansion }]}>
            <Feather name={iconName} size={20} color={colors.accentFg} />
          </Animated.View>
        </View>
        <Animated.Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: colors.accentFg,
              fontFamily: fonts.mono,
              opacity: expansion,
              maxWidth: labelMaxWidth,
              marginLeft: labelMargin,
            },
          ]}
        >
          {label.toUpperCase()}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 0,
    borderWidth: 1.5,
    padding: 5,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 0,
  },
  iconWrap: {
    width: 20,
    height: 20,
  },
  label: {
    // Bigger + bolder per request; still tracks the DS mono-caps treatment.
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    overflow: 'hidden',
  },
});
