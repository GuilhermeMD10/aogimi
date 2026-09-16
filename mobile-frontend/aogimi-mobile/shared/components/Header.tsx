import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from './IconButton';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';

/** DESIGN.md's header row: 60pt tall, a circle at each end, 12pt gaps. */
const BAR_H = 60;

/**
 * **The pushed screen's header** — DESIGN.md's `[44 back] [12] [title 15/500 +
 * mono subtitle, centred] [12] [44 more]`.
 *
 * Both end slots are exactly the circle's width whether or not a button is in
 * them, so the title is centred in the *row*, not in whatever is left over —
 * and it does not shift when a `more` button appears or a subtitle changes
 * width. `size` is 44 on a pushed screen and 36 inside the Sky top bar, per
 * DESIGN.md's icon button.
 *
 * `onMore` is the one trailing action every header offers. A screen with a
 * different trailing control passes `right` instead; the slot stays the same
 * width either way.
 */
export function Header({
  title,
  subtitle,
  japanese = false,
  onBack,
  backLabel,
  onMore,
  moreLabel,
  moreDisabled = false,
  right,
  size = 44,
}: {
  title: string;
  /** The mono line under the title — `340 Stars · 28 Due`. */
  subtitle?: string;
  /** Sets the title in the JP face — a deck name, a book title. */
  japanese?: boolean;
  onBack?: () => void;
  backLabel?: string;
  onMore?: () => void;
  moreLabel?: string;
  /** Keeps the button in place but inert — a menu that is not wired yet. */
  moreDisabled?: boolean;
  /** A custom trailing control, in place of `more`. */
  right?: React.ReactNode;
  size?: 44 | 36;
}) {
  const p = usePalette();
  const s = useStyles(p, size);

  return (
    <View pointerEvents="box-none" style={s.row}>
      <View style={s.slot}>
        {onBack && (
          <IconButton glyph="back" size={size} onPress={onBack} accessibilityLabel={backLabel ?? ''} />
        )}
      </View>

      <View style={s.titleWrap} pointerEvents="none">
        <Text numberOfLines={1} ellipsizeMode="tail" style={[s.title, japanese && s.titleJp]}>
          {title}
        </Text>
        {subtitle !== undefined && (
          <Text numberOfLines={1} style={s.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={s.slot}>
        {right ??
          (onMore && (
            <IconButton
              glyph="more"
              size={size}
              onPress={onMore}
              disabled={moreDisabled}
              accessibilityLabel={moreLabel ?? ''}
            />
          ))}
      </View>
    </View>
  );
}

function useStyles(p: Palette, size: number) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          height: BAR_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        /** Fixed on both sides — see the header on why the title stays put. */
        slot: { width: size, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
        titleWrap: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
        title: { ...type.headerTitle, color: p.ink, maxWidth: '90%' },
        /** DESIGN.md's header size in the JP face — the Medium cut of the same
         *  family `displayKanji` names; only the family is borrowed. */
        titleJp: { fontFamily: type.displayKanji.fontFamily },
        subtitle: {
          ...type.monoMeta,
          color: p.muted,
          fontVariant: ['tabular-nums'],
        },
      }),
    [p, size],
  );
}
