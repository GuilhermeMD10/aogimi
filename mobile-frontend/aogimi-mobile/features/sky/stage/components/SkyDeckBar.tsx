import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { fontFamily, fontSize, palette, radius, spacing } from '@/theme/tokens';
import { NIGHT } from '../lib/nightChrome';

/**
 * The focused tier's bar: the way back out, the deck's name and figures, and the
 * two things you can do to a deck you are standing in.
 *
 * **It renders in every focused state**, so the way back out can never be
 * collapsed away with something else — the web's DeckBar rule, and it matters
 * more here because a phone has no Escape key. Android's hardware back is
 * wired to the same action in the view.
 */

type Props = {
  name: string;
  cardCount: number;
  /** `null` while the count is in flight — the pill draws a dash. */
  dueCount: number | null;
  onBack: () => void;
  onStudyDeck: () => void;
  onRequestDelete: () => void;
};

export function SkyDeckBar({
  name,
  cardCount,
  dueCount,
  onBack,
  onStudyDeck,
  onRequestDelete,
}: Props) {
  const nothingDue = dueCount === 0;

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Back to the whole sky"
        style={styles.iconBtn}
      >
        <Feather name="chevron-left" size={18} color={palette.ink} />
      </Pressable>

      <View style={styles.text}>
        {/* Deck names are user-written and usually Japanese, so a JP face —
            `jpSans`, not `jp`. The latter is the Mincho serif stack meant for
            reader body text; the web's `--face-jp` here is Noto Sans JP. */}
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text style={styles.meta}>
          {cardCount.toLocaleString()} {cardCount === 1 ? 'CARD' : 'CARDS'}
          {' · '}
          {dueCount === null ? '—' : `${dueCount.toLocaleString()} DUE`}
        </Text>
      </View>

      <Pressable
        onPress={onStudyDeck}
        disabled={nothingDue}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ disabled: nothingDue }}
        accessibilityLabel={nothingDue ? 'Nothing due in this deck' : `Study ${dueCount} due`}
        style={[styles.studyBtn, { opacity: nothingDue ? 0.4 : 1 }]}
      >
        <Feather name="zap" size={14} color={palette.btnInk} />
      </Pressable>

      <Pressable
        onPress={onRequestDelete}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${name}`}
        style={styles.deleteBtn}
      >
        <Feather name="trash-2" size={15} color={palette.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: NIGHT.glass,
    borderColor: palette.bdB,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  text: { flex: 1, minWidth: 0, gap: 3 },
  name: {
    color: palette.ink,
    fontFamily: fontFamily.jpSans,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  meta: { color: palette.muted, fontFamily: fontFamily.mono, fontSize: 9.5, letterSpacing: 0.9 },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: palette.tintB,
  },
  studyBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: palette.btn,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: palette.dangerBg,
    borderColor: palette.dangerBd,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
