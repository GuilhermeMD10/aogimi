import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius } from '@/theme/tokens';
import type { CardRecord, CardState } from '@/lib/types';

type Props = {
  card: CardRecord;
  onPress: () => void;
};

export function CardGridItem({ card, onPress }: Props) {
  const c = useColors();
  const chip = chipColors(card.state, c);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        { backgroundColor: c.bgElev, borderColor: c.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.chip, { backgroundColor: chip.bg }]}>
        <Text style={[styles.chipText, { color: chip.fg }]}>{card.state}</Text>
      </View>
      <Text style={[styles.front, { color: c.fg }]} numberOfLines={1}>
        {card.front}
      </Text>
      {card.reading.length > 0 && (
        <Text style={[styles.reading, { color: c.fgMuted }]} numberOfLines={1}>
          {card.reading}
        </Text>
      )}
    </Pressable>
  );
}

function chipColors(
  state: CardState,
  c: {
    accentSoft: string;
    fg: string;
    warning: string;
    success: string;
  },
): { bg: string; fg: string } {
  if (state === 'learning') return { bg: 'rgba(242, 179, 61, 0.18)', fg: c.warning };
  if (state === 'mastered') return { bg: 'rgba(59, 122, 64, 0.14)', fg: c.success };
  return { bg: c.accentSoft, fg: c.fg };
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  chip: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  front: {
    fontFamily: fontFamily.jp,
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  reading: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.xs + 1,
    textAlign: 'center',
  },
});
