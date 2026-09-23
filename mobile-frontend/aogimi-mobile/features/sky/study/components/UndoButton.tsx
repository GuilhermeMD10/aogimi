import { StyleSheet } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { UndoIcon } from '@/shared/icons/undo';
import { usePalette, radius } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';

/** DESIGN.md's action row is 48pt tall, and this is its square end. */
const SIZE = 48;

/**
 * **Step back one card** — `Study.dc.html`'s 48×48 square beside the Reveal
 * button, Tier 2 glass with the drawn undo mark.
 *
 * A square and not an `IconButton`, which is a circle by definition: the
 * shape rule reserves circles for icon buttons in a *header* and gives the
 * action row 12pt rectangles, so this one matches the button it sits next to
 * rather than the one in the bar above.
 *
 * Only a single step back is supported — `disabled` reflects the empty undo
 * buffer. Local-only: the backend keeps the original event row, which is
 * harmless because the next review on the same card overwrites the card state
 * there.
 */
export function UndoButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const p = usePalette();
  const t = useT();
  return (
    <Touchable
      surface="glass"
      radius={radius.control}
      minTarget={false}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t('study.undo')}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.btn, disabled && styles.disabled]}
    >
      <UndoIcon size={18} color={p.ink} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** DESIGN.md's disabled step, and the one the composition draws on the
   *  first card of a session. */
  disabled: { opacity: 0.4 },
});
