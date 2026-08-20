import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';

/**
 * Avatar, name, and the "looking up since" line — the identity block.
 *
 * The avatar itself triggers the picker, in addition to the header's "Edit"
 * button (both open the same sheet), because tapping your own face to change
 * it is the thing people try first.
 */
export function ProfileIdentity({
  glyph,
  displayName,
  /** Already formatted and localised — e.g. "LOOKING UP SINCE JAN 2026". */
  since,
  changeAvatarLabel,
  saving,
  onPressAvatar,
}: {
  glyph: string;
  displayName: string;
  since: string;
  changeAvatarLabel: string;
  saving: boolean;
  onPressAvatar: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);

  return (
    <View style={styles.row}>
      <Touchable
        minTarget={false}
        onPress={onPressAvatar}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={changeAvatarLabel}
        style={[styles.avatar, saving && styles.avatarSaving]}
      >
        <Text style={styles.avatarGlyph}>{glyph}</Text>
      </Touchable>

      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.since}>{since}</Text>
      </View>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
          marginTop: spacing.lg + 4,
        },
        avatar: {
          width: 68,
          height: 68,
          // Decorative circle — half the box, not a token radius.
          borderRadius: 34,
          backgroundColor: p.avatar,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarSaving: { opacity: 0.6 },
        avatarGlyph: {
          fontFamily: fontFamily.jp,
          fontSize: 26,
          fontWeight: '700',
          color: p.avatarInk,
        },
        text: { flex: 1, minWidth: 0 },
        name: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.xxl,
          fontWeight: '700',
          lineHeight: 27,
          color: p.ink,
        },
        since: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 1.5,
          letterSpacing: 1,
          color: p.muted,
          marginTop: 5,
        },
      }),
    [p],
  );
}
