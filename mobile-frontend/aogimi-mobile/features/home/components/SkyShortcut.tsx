import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';

/**
 * The sky panel on Home — a shortcut to `/sky`, and **deliberately empty**.
 *
 * The handoff draws a starfield in here. This ships the *container* only: the
 * box, the night ground, the caption and the chevron. Star rendering is not
 * faked with decorative SVG circles, because the real renderer already exists
 * (`features/sky/map/components/SkyMap.tsx`) and mounting it is a separate
 * piece of work — it needs a camera frame, a card set and an LOD decision at
 * this size, none of which a placeholder would inform. When it lands it becomes
 * the child of this component and nothing else here changes.
 *
 * **The ground stays dark in both themes.** `sky1..3` are night in Day as well,
 * because stars need night; that is why the caption reads `gold` and the
 * chevron `covtrack`-adjacent pale rather than taking `ink`/`soft`, which flip.
 */
export function SkyShortcut({
  caption,
  accessibilityLabel,
  onPress,
}: {
  caption: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.panel}
    >
      <View style={styles.footer}>
        <Text style={styles.caption}>{caption}</Text>
        {/* Hardcoded, not a token: this sits on the night ground, which does
            not flip with the theme, so every `palette` ink would be wrong in
            one of the two columns. It is the handoff's own chevron colour. */}
        <Feather name="chevron-right" size={16} color="#cfd8ea" />
      </View>
    </Pressable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        panel: {
          height: 172,
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: p.bdA,
          // The middle stop of the three-stop sky. A flat fill rather than a
          // gradient — decorative gradients went in the strip-to-basics pass,
          // and the real star field will supply its own ground anyway.
          backgroundColor: p.sky2,
          justifyContent: 'flex-end',
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md + 2,
          paddingBottom: spacing.md,
        },
        caption: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 1,
          letterSpacing: 1.2,
          // The handoff's warm caption ink, which reads on the night ground in
          // both columns.
          color: '#d9c79a',
        },
      }),
    [p],
  );
}
