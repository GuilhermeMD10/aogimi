import { StyleSheet, Text, View } from 'react-native';
import { fontFamily } from '@/theme/tokens';

// Visual badge for a book's sync state. Display-only.
// Colors mirror `design synch/sync-states/tokens.css`.

export type SyncPillState = 'synced' | 'unsynced' | 'toImport';

const CONFIG: Record<SyncPillState, { defaultLabel: string; color: string; bg: string; border: string }> = {
  synced: {
    defaultLabel: 'SYNCED',
    color: '#2E9F58',
    bg: '#E3F2EA',
    border: '#8FC9A4',
  },
  unsynced: {
    defaultLabel: 'UNSYNCED',
    color: '#1E3D6B',
    bg: '#E0E5ED',
    border: '#8896AC',
  },
  toImport: {
    defaultLabel: 'TO IMPORT',
    color: '#6B6661',
    bg: '#F1EFEC',
    border: '#C9C5C0',
  },
};

export function SyncPill({
  state,
  label,
  onCover = false,
}: {
  state: SyncPillState;
  /** Override the default label text. */
  label?: string;
  /** When true, paper background instead of the tinted state colour. */
  onCover?: boolean;
}) {
  const cfg = CONFIG[state];
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: onCover ? '#FFFEFB' : cfg.bg,
          borderColor: cfg.border,
        },
      ]}
    >
      <Text style={[styles.label, { color: cfg.color }]}>
        {label ?? cfg.defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
