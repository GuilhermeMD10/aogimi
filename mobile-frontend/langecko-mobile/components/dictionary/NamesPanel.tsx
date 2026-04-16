import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import type { NameResult } from '@/lib/types';

const MAX_NAMES = 10;

export const NamesPanel = memo(function NamesPanel({ names }: { names: NameResult[] }) {
  const styles = useThemedStyles(createStyles);
  const shown = names.slice(0, MAX_NAMES);

  return (
    <Card style={styles.card}>
      <Text style={styles.heading}>Names ({names.length})</Text>

      <View style={styles.list}>
        {shown.map((n, i) => (
          <NameRow key={n.id} name={n} isLast={i === shown.length - 1} styles={styles} />
        ))}
      </View>
    </Card>
  );
});

function NameRow({ name, isLast, styles }: { name: NameResult; isLast: boolean; styles: ReturnType<typeof createStyles> }) {
  const primary = name.kanji ?? name.kana;
  const hasBothScripts = name.kanji != null;

  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <View style={styles.rowHeader}>
        <Text style={styles.primary}>{primary}</Text>
        {hasBothScripts ? <Text style={styles.secondary}>{name.kana}</Text> : null}
        {name.name_type.length > 0 ? (
          <Text style={styles.type}>{name.name_type.join(', ')}</Text>
        ) : null}
      </View>
      {name.translations.length > 0 ? (
        <Text style={styles.translations}>{name.translations.join('; ')}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  card: { marginTop: spacing.md },
  heading: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.serifSemiBold,
    color: c.textPrimary,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm },

  row: { paddingBottom: spacing.sm },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  primary:   { fontSize: fontSize.sm, fontWeight: '500', color: c.textPrimary },
  secondary: { fontSize: fontSize.xs, color: c.textSecondary },
  type:      { fontSize: fontSize.xs, color: c.textSecondary, fontStyle: 'italic' },
  translations: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
    marginTop: 2,
  },
});
