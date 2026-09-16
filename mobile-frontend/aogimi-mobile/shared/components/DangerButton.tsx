import { spacing } from '@/theme/tokens';
import { Button } from './Button';

/**
 * The destructive action — sign out on Profile and on Settings.
 *
 * **Now a thin wrapper over `Button`'s `destructive` variant**, which is
 * DESIGN.md's recipe: `destructive-tint` fill, `destructive-border`,
 * `destructive` ink and a 16px trash glyph. It used to be a separate outline
 * button because `Button` read the static Day-locked palette and was on the
 * list to migrate; it has since been migrated, so the fork has no reason left
 * to exist.
 *
 * What survives is the *placement* — the `marginTop` that keeps sign-out away
 * from whatever sits above it — and the accessible name, which is why the two
 * call sites still get a named component rather than a `Button` with three
 * props each.
 */
export function DangerButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Button
      label={label}
      onPress={onPress}
      variant="destructive"
      full
      style={{ marginTop: spacing.lg }}
    />
  );
}
