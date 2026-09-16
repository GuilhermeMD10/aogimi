import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BlurView } from 'expo-blur';
import { Glass } from './Glass';
import { PressableBackdrop, Touchable } from './Touchable';
import { usePalette, useTheme } from '@/theme/ThemeContext';
import { glassTier } from '@/theme/glass';
import { DECELERATE, SURFACE_MS } from '@/theme/motion';
import { radius, spacing, type, type Palette } from '@/theme/tokens';
import { useReduceMotion } from '@/lib/useReduceMotion';

/** DESIGN.md's popover: 280 wide, 56pt rows with a 40pt circular icon plate. */
const MENU_W = 280;
const ROW_H = 56;
const PLATE = 40;

export type PopoverMenuItem = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  /** Colours the plate tint and the label with `danger` together. */
  destructive?: boolean;
  /** Accent plate and accent label — the row the menu is really for. */
  accent?: boolean;
  /** Trailing mono chip — `80%`, `28`. */
  meta?: string;
  disabled?: boolean;
};

/**
 * **The deep-press menu** — DESIGN.md's popover: the screen dims (`scrim` +
 * 8px blur), a Tier 4 pane 280pt wide with radius 16 sits in the middle, its
 * rows 56pt with a 40pt Tier 1 icon plate and a hairline between them, and a
 * caption under it says how to leave.
 *
 * `header` is the slot above the pane — the lifted deck node with its name and
 * figures, in the sky's case. Anything, so long as it is not another surface
 * the menu has to compete with.
 *
 * ── A row's action fires after the menu has gone ───────────────────────────
 * Most rows open something else that is itself a `Modal` (a sheet, an alert),
 * and iOS presents one modal per view controller: presenting the next while
 * this one is still dismissing is refused. So a press records the action,
 * dismisses, and runs it from the `Modal`'s own `onDismiss` — which fires only
 * once the dismissal has completed. Android has no such rule and no such
 * callback, so it runs the action straight away.
 */
export function PopoverMenu({
  visible,
  onDismiss,
  items,
  header,
  caption,
}: {
  visible: boolean;
  onDismiss: () => void;
  items: PopoverMenuItem[];
  header?: React.ReactNode;
  caption?: string;
}) {
  const p = usePalette();
  const { themeName } = useTheme();
  const s = useStyles(p);
  const reduceMotion = useReduceMotion();
  const g = useMemo(() => glassTier(p, 4, themeName === 'night'), [p, themeName]);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) {
      fade.setValue(0);
      return;
    }
    if (reduceMotion) {
      fade.setValue(1);
      return;
    }
    const anim = Animated.timing(fade, {
      toValue: 1,
      duration: SURFACE_MS,
      easing: DECELERATE,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [visible, reduceMotion, fade]);

  // The chosen row's action, held until the modal has actually gone.
  const pendingRef = useRef<(() => void) | null>(null);
  const flush = useCallback(() => {
    const run = pendingRef.current;
    pendingRef.current = null;
    run?.();
  }, []);
  const select = useCallback(
    (item: PopoverMenuItem) => {
      pendingRef.current = item.onPress;
      onDismiss();
      if (Platform.OS !== 'ios') flush();
    },
    [onDismiss, flush],
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
      onDismiss={flush}
      statusBarTranslucent
    >
      <Animated.View style={[styles.root, { opacity: fade }]}>
        <BlurView intensity={8} tint={g.blurTint} pointerEvents="none" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: p.scrim }]} />
        {/* No nudge, no haptic — tapping away is not contact with a control. */}
        <PressableBackdrop style={StyleSheet.absoluteFill} onPress={onDismiss} />

        <View style={styles.centre} pointerEvents="box-none">
          {header}

          <Glass tier={4} radius={radius.card} style={s.menu}>
            {items.map((item, i) => {
              const tone = item.destructive ? p.danger : item.accent ? p.accent : p.ink;
              return (
                <View key={item.key}>
                  {i > 0 && <View style={s.divider} />}
                  <Touchable
                    onPress={() => select(item)}
                    disabled={item.disabled}
                    minTarget={false}
                    // A destructive row's feedback is the confirm that follows it.
                    haptic={!item.destructive}
                    accessibilityRole="menuitem"
                    accessibilityLabel={item.label}
                    accessibilityState={{ disabled: !!item.disabled }}
                    style={[s.row, item.disabled && s.rowDisabled]}
                  >
                    <View
                      style={[
                        s.plate,
                        item.destructive
                          ? s.plateDanger
                          : item.accent
                            ? s.plateAccent
                            : s.plateTier,
                      ]}
                    >
                      <Feather name={item.icon} size={18} color={tone} />
                    </View>
                    <Text style={[s.label, { color: tone }]} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {item.meta !== undefined && (
                      <Text style={[s.meta, item.accent && s.metaAccent]}>{item.meta}</Text>
                    )}
                  </Touchable>
                </View>
              );
            })}
          </Glass>

          {caption !== undefined && <Text style={s.caption}>{caption}</Text>}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centre: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },
});

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        menu: { width: MENU_W, padding: 6 },
        row: {
          height: ROW_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          borderRadius: radius.control,
        },
        rowDisabled: { opacity: 0.45 },
        divider: { height: 1, backgroundColor: p.bdB, marginHorizontal: spacing.sm },
        plate: {
          width: PLATE,
          height: PLATE,
          borderRadius: PLATE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
        },
        plateTier: { backgroundColor: p.glassSubtle, borderColor: p.glassBorder },
        plateAccent: { backgroundColor: p.glassAccent, borderColor: p.glassAccentBd },
        plateDanger: { backgroundColor: p.dangerBg, borderColor: p.dangerBd },
        label: { ...type.bodyMd, fontFamily: type.headerTitle.fontFamily, flex: 1 },
        meta: {
          ...type.monoMeta,
          color: p.muted,
          backgroundColor: p.glassSubtle,
          borderRadius: radius.chip,
          paddingHorizontal: 7,
          paddingVertical: 2,
          overflow: 'hidden',
        },
        metaAccent: { color: p.accent, backgroundColor: p.glassAccent },
        caption: { ...type.bodySm, color: p.faint, textAlign: 'center' },
      }),
    [p],
  );
}
