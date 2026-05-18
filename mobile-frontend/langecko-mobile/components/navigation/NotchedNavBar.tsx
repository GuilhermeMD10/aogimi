import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';

// Static bottom tab bar. Flat top edge — no notch, no animation. The
// active slot is communicated only via the icon's bordered "hero" style.
// File still named NotchedNavBar to avoid a rename ripple; the notch
// rendering is gone.

const NAV_HEIGHT = 60;
const ICON = 20;

const SLOTS = ['profile', 'dictionary', 'reader', 'decks', 'settings'] as const;
type SlotKey = (typeof SLOTS)[number];

type FeatherName = React.ComponentProps<typeof Feather>['name'];
const ICONS: Record<SlotKey, FeatherName> = {
  profile: 'user',
  dictionary: 'search',
  reader: 'book-open',
  decks: 'layers',
  settings: 'settings',
};

const FALLBACK_LABELS: Record<SlotKey, string> = {
  profile: 'You',
  dictionary: 'Dictionary',
  reader: 'Books',
  decks: 'Decks',
  settings: 'Settings',
};

const INK = '#1A1918';
const PAPER = '#FFFEFB';
const MUTED = 'rgba(26,25,24,0.55)';
const BORDER_HAIR = 'rgba(26,25,24,0.10)';

export function NotchedNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const paper = theme.meta.isDark ? '#1E1818' : PAPER;
  const ink = theme.meta.isDark ? '#FAFAF9' : INK;
  const muted = theme.meta.isDark ? 'rgba(250,250,249,0.55)' : MUTED;
  const border = theme.meta.isDark ? 'rgba(250,250,249,0.10)' : BORDER_HAIR;

  const activeRouteName = state.routes[state.index]?.name ?? '';
  const activeSlotIdx = Math.max(0, SLOTS.indexOf(activeRouteName as SlotKey));

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: paper,
            borderTopColor: border,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.slotsRow} pointerEvents="box-none">
          {SLOTS.map((key, i) => {
            const route = state.routes.find((r) => r.name === key);
            if (!route) return <View key={key} style={styles.slotPlaceholder} />;

            const active = i === activeSlotIdx;
            const descriptor = descriptors[route.key];
            const labelOpt = descriptor?.options.tabBarLabel;
            const label = typeof labelOpt === 'string' ? labelOpt : (descriptor?.options.title ?? FALLBACK_LABELS[key]);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!active && !event.defaultPrevented) navigation.navigate(key as never);
            };

            return (
              <Slot
                key={key}
                label={label}
                iconName={ICONS[key]}
                active={active}
                ink={ink}
                muted={muted}
                paper={paper}
                onPress={onPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

function Slot({
  label,
  iconName,
  active,
  ink,
  muted,
  paper,
  onPress,
}: {
  label: string;
  iconName: FeatherName;
  active: boolean;
  ink: string;
  muted: string;
  paper: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={4}
      style={styles.slot}
    >
      <View style={styles.col}>
        <View
          style={[
            styles.iconWrap,
            active && {
              backgroundColor: paper,
              // No border — the active chip relies on its paper fill plus
              // the multi-layer shadow for definition. With a square-look
              // border the corners were not respecting borderRadius on
              // some Android builds; dropping the border lets the
              // 20px-radius round shape read cleanly everywhere.
              borderRadius: 50,
              boxShadow:
                '0px 4px 10px rgba(26,25,24,0.18), 0px 1px 2px rgba(26,25,24,0.10), inset 0px 1px 0px rgba(255,255,255,0.8)',
            },
          ]}
        >
          <Feather name={iconName} size={ICON} color={active ? ink : muted} />
        </View>
        <Text style={[styles.label, { color: active ? ink : muted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 55,
  },
  card: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 12,
  },
  slotsRow: {
    height: NAV_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: NAV_HEIGHT,
  },
  slotPlaceholder: { flex: 1 },
  col: { alignItems: 'center' },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    // Perfect circle (width / 2). Border + box-shadow on the active state
    // both follow this radius, so the active slot reads as a round chip.
    borderRadius: 20,
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
