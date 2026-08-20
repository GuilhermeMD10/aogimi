import { Children, cloneElement, isValidElement, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from './Touchable';
import Feather from '@expo/vector-icons/Feather';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';
import { Card } from './Card';

/**
 * The settings shape: a mono micro-label above a card of rows
 * separated by hairlines.
 *
 * Three pieces, because the label sits *outside* the card and the dividers sit
 * *between* rows:
 *
 *   <SectionLabel>APPEARANCE</SectionLabel>
 *   <RowGroup>
 *     <Row label="Theme" value="Night" onPress={…} />
 *     <Row label="Language" value="English" onPress={…} />
 *   </RowGroup>
 *
 * `RowGroup` drops the divider on the last row for you, so a caller never
 * tracks which row is final — including when the final row is conditional.
 */

export function SectionLabel({ children }: { children: string }) {
  const p = usePalette();
  const styles = useStyles(p);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function RowGroup({ children }: { children: React.ReactNode }) {
  // `Children.toArray` drops the `false`/`null` that a `{cond && <Row/>}` child
  // evaluates to, so "the last row" means the last row *actually rendered* —
  // which is the whole reason this is computed rather than passed in. A group
  // whose final row is conditional would otherwise show a hairline hanging
  // against the card's bottom edge whenever that row is absent.
  const rows = Children.toArray(children);
  const lastIdx = rows.length - 1;

  // `clip`, because a pressed row's own background would otherwise square off
  // the card's rounded corners.
  return (
    <Card padded={false} clip>
      {rows.map((child, i) =>
        i === lastIdx && isValidElement<{ last?: boolean }>(child)
          ? cloneElement(child, { last: true })
          : child,
      )}
    </Card>
  );
}

export function Row({
  label,
  /** Secondary line under the label — the toggle-row description. */
  description,
  /** Right-aligned value text. Ignored when `children` is given. */
  value,
  /** Right-aligned custom content: a chip row, a toggle, a status dot. */
  children,
  /** Draws the push chevron. Set it on rows that navigate. */
  chevron = false,
  /** Renders the label in `danger` — destructive rows. */
  destructive = false,
  /** Suppresses this row's bottom hairline. Set on the last row of a group. */
  last = false,
  onPress,
}: {
  label: string;
  description?: string;
  value?: string;
  children?: React.ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);

  const body = (
    <View style={[styles.row, !last && styles.divided]}>
      <View style={styles.labelCol}>
        <Text style={[styles.label, destructive && styles.labelDanger]}>{label}</Text>
        {description !== undefined && <Text style={styles.description}>{description}</Text>}
      </View>

      <View style={styles.rightCol}>
        {children ?? (value !== undefined ? <Text style={styles.value}>{value}</Text> : null)}
      </View>

      {chevron && (
        <Feather
          name="chevron-right"
          size={14}
          color={destructive ? p.dangerBd : p.faint}
        />
      )}
    </View>
  );

  // A row without `onPress` is a display row — wrapping it in a Pressable would
  // announce it as a button to a screen reader.
  if (!onPress) return body;
  return (
    // The row's own padding already clears the floor, and `minTarget` would
    // fight a full-width child.
    <Touchable onPress={onPress} accessibilityRole="button" minTarget={false}>
      {body}
    </Touchable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        sectionLabel: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 2,
          letterSpacing: 1.5,
          color: p.muted,
          marginTop: spacing.lg + 2,
          marginBottom: spacing.sm,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: 13,
          paddingHorizontal: spacing.lg,
        },
        // 1px opaque, not `hairlineWidth`: `paperBd` is already the palette's
        // lightest visible edge, and a sub-pixel rule on top of that vanishes
        // on a 3x screen.
        divided: { borderBottomWidth: 1, borderBottomColor: p.paperBd },
        labelCol: { flexShrink: 1 },
        label: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm + 0.5,
          fontWeight: '700',
          color: p.ink,
        },
        labelDanger: { color: p.danger },
        description: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.xs,
          color: p.muted,
          marginTop: 1,
        },
        rightCol: {
          marginLeft: 'auto',
          flexShrink: 1,
          alignItems: 'flex-end',
        },
        value: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          color: p.muted,
        },
      }),
    [p],
  );
}
