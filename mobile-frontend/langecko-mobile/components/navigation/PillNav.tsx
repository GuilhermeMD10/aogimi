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

// ── PillNav ──────────────────────────────────────────────────────────────────

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

// ── Tab button with inflate animation ───────────────────────────────────────

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
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: active ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [active, anim]);

  const paddingLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 14],
  });
  const paddingRight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 16],
  });
  const labelOpacity = anim;
  const labelMaxWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });
  const labelMargin = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 7],
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
            backgroundColor: active ? colors.fg : 'transparent',
          },
        ]}
      >
        <Feather name={iconName} size={20} color={active ? colors.accentFg : colors.fgMuted} />
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: colors.accentFg,
              opacity: labelOpacity,
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    fontFamily: fontFamily.ui,
    overflow: 'hidden',
  },
});
