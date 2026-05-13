import { useEffect, useRef } from 'react';
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

const ANIM_DURATION = 220;
const ICON_BIG = 22;
const ICON_SMALL = 16;
const LABEL_HEIGHT = 14;

// ── PillNav ──────────────────────────────────────────────────────────────────

/** Bottom nav. Pill spans close to the device width and gives every tab
 *  an equal slice. Inactive tabs show only the icon, centered. Active
 *  tabs fill with `fg`, shrink the icon and lift it up so the label
 *  appears underneath. Reverses on deselect. */
export function PillNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const pillBg = theme.meta.isDark ? 'rgba(30,24,20,1)' : 'rgba(255,255,255,1)';

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

            return (
              <PillTab
                key={route.key}
                label={label}
                iconName={iconName}
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

// ── Tab button ──────────────────────────────────────────────────────────────

function PillTab({
  label,
  iconName,
  active,
  colors,
  onPress,
}: {
  label: string;
  iconName: FeatherName;
  active: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) {
  // 0 = inactive, 1 = active. Drives icon scale, label height (which lets
  // the icon naturally lift inside the centered flex column), label
  // opacity, icon color crossfade, and tab background.
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: ANIM_DURATION,
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  const iconScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, ICON_SMALL / ICON_BIG],
  });
  const labelHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LABEL_HEIGHT],
  });
  const inactiveIconOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const bgColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', colors.fg],
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={4}
      style={styles.btnPress}
    >
      <Animated.View style={[styles.btn, { backgroundColor: bgColor }]}>
        {/* The wrapper stays at ICON_BIG² so layout space is constant; the
         *  visible icon shrinks via transform.scale, which is what drives
         *  the "lift up + label appears below" effect inside the centered
         *  flex column. Two stacked Feathers crossfade colors (Feather's
         *  `color` prop isn't animatable). */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: inactiveIconOpacity }]}>
            <Feather name={iconName} size={ICON_BIG} color={colors.fgMuted} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
            <Feather name={iconName} size={ICON_BIG} color={colors.bg} />
          </Animated.View>
        </Animated.View>

        <Animated.View style={{ height: labelHeight, overflow: 'hidden' }}>
          <Animated.Text
            numberOfLines={1}
            style={[styles.label, { color: colors.bg, opacity: progress }]}
          >
            {label}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'stretch',
    zIndex: 40,
    bottom: 20,
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
    alignItems: 'stretch',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    gap: 4,
  },
  btnPress: {
    flex: 1,
  },
  btn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  iconWrap: {
    width: ICON_BIG,
    height: ICON_BIG,
  },
  label: {
    height: LABEL_HEIGHT,
    lineHeight: LABEL_HEIGHT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    fontFamily: fontFamily.ui,
    textAlign: 'center',
  },
});
