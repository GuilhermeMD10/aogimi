import { type ComponentType } from 'react';
import { Alert, type GestureResponderEvent, Pressable, StyleSheet } from 'react-native';
import { SyncedIcon, UnsyncedIcon, ImportIcon, type SyncIconProps } from '@/components/icons/sync-icons';

// Visual badge for a sync state. Two shapes:
//
//   - `pill`: white round badge containing the cloud icon. Used for the
//     attention-grabbing states on books (unsynced / toImport).
//   - `dot`:  small solid coloured circle. Quieter — used for the synced
//     state on books and for the per-card / per-deck unsynced indicator.
//
// Default rendering picks automatically: synced → dot, others → pill.
// Callers can force `variant="dot"` (decks/cards do this for their
// unsynced indicator). Tapping any pill shows a short explanation alert.

export type SyncPillState = 'synced' | 'unsynced' | 'toImport';

const CONFIG: Record<
  SyncPillState,
  { defaultLabel: string; color: string; Icon: ComponentType<SyncIconProps>; message: { title: string; body: string } }
> = {
  synced: {
    defaultLabel: 'SYNCED',
    color: '#2E9F58',
    Icon: SyncedIcon,
    message: {
      title: 'Synced',
      body: 'This book’s progress is synced across devices!',
    },
  },
  unsynced: {
    defaultLabel: 'UNSYNCED',
    color: '#1E3D6B',
    Icon: UnsyncedIcon,
    message: {
      title: 'Not synced',
      body: 'This book’s progress is only accessible on this device. Sync it to make it available across all devices.',
    },
  },
  toImport: {
    defaultLabel: 'TO IMPORT',
    color: '#6B6661',
    Icon: ImportIcon,
    message: {
      title: 'On your account',
      body: 'This book is on your account but not on this device. Tap the book to import the file here.',
    },
  },
};

export function SyncPill({
  state,
  label,
  variant,
}: {
  state: SyncPillState;
  /** Override the default label text. */
  label?: string;
  /** Force a shape. Default: dot for synced, pill for others. */
  variant?: 'pill' | 'dot';
}) {
  const cfg = CONFIG[state];
  const Icon = cfg.Icon;
  const effectiveVariant: 'pill' | 'dot' = variant ?? (state === 'synced' ? 'dot' : 'pill');

  // No hitSlop — the pill sits on top of a tappable book tile, and any
  // expansion of the touch area would steal taps from the parent. Keep
  // the press strictly to the visible pixels.
  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    Alert.alert(cfg.message.title, cfg.message.body);
  };

  if (effectiveVariant === 'dot') {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={label ?? cfg.defaultLabel}
        style={[styles.dot, { backgroundColor: cfg.color }]}
      />
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={label ?? cfg.defaultLabel}
      style={[
        styles.pill,
        {
          backgroundColor: 'white',
          borderColor: 'white',
        },
      ]}
    >
      <Icon size={18} color={cfg.color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.2)',
  },
  // Small colored dot — 10px filled circle with a thin white ring so the
  // dot reads against any cover. Same lift shadow as the pill for a
  // consistent badge feel.
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'white',
    alignSelf: 'flex-start',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.25)',
  },
});
