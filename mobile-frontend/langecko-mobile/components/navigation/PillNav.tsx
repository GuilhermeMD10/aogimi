import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeColors } from '@/theme/tokens';
import { fontFamily } from '@/theme/tokens';

// ── Icon map (Feather is the open-source ancestor of Lucide — same line style)
type FeatherName = React.ComponentProps<typeof Feather>['name'];

const ICONS: Record<string, FeatherName> = {
  reader: 'book-open',
  dictionary: 'search',
  decks: 'layers',
  profile: 'user',
};

const FALLBACK_LABELS: Record<string, string> = {
  reader: 'Reader',
  dictionary: 'Dictionary',
  decks: 'Decks',
  profile: 'You',
};

const ANIM_DURATION = 300;

// ── PillNav ──────────────────────────────────────────────────────────────────

export function PillNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const pillBg = theme.meta.isDark ? 'rgba(30,24,20,1)' : 'rgba(255,255,255,1)';

  // `progress` is a shared 0→1 value that drives the current transition.
  // `prevIndex` is the tab the user is leaving; only it and the new active
  // tab animate. Everything else stays put — no in-between sweep.
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
    <View pointerEvents="box-none" style={[styles.host, { bottom: 6 + insets.bottom }]}>
      <View style={styles.shadowWrap}>
        <View style={[styles.pill, { backgroundColor: pillBg, borderColor: colors.border }]}>
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

            // Only the entering tab animates 0→1, only the leaving tab
            // animates 1→0, everything else is a static 0.
            const proximity =
              idx === state.index
                ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
                : idx === prevIndex
                  ? progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
                  : progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0] });

            return (
              <PillTab
                key={route.key}
                label={label}
                iconName={iconName}
                proximity={proximity}
                active={active}
                colors={colors}
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

// ── Tab button (every animated style derives from the shared `proximity`) ──

function PillTab({
  label,
  iconName,
  proximity,
  active,
  colors,
  onPress,
}: {
  label: string;
  iconName: FeatherName;
  proximity: Animated.AnimatedInterpolation<number>;
  active: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const paddingLeft = proximity.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 14],
  });
  const paddingRight = proximity.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 16],
  });
  const labelMaxWidth = proximity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });
  const labelMargin = proximity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 7],
  });
  const bgColor = proximity.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', colors.fg],
  });
  const inactiveIconOpacity = proximity.interpolate({
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
        {/* Two icons crossfaded — Feather's color prop isn't animatable */}
        <View style={styles.iconWrap}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: inactiveIconOpacity }]}>
            <Feather name={iconName} size={20} color={colors.fgMuted} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: proximity }]}>
            <Feather name={iconName} size={20} color={colors.accentFg} />
          </Animated.View>
        </View>
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: colors.accentFg,
              opacity: proximity,
              maxWidth: labelMaxWidth,
              marginLeft: labelMargin,
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  shadowWrap: {
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
  },
  iconWrap: {
    width: 20,
    height: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    fontFamily: fontFamily.ui,
    overflow: 'hidden',
  },
});
