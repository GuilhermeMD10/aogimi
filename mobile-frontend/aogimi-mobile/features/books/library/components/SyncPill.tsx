import { type ComponentType } from 'react';
import { Alert, type GestureResponderEvent, StyleSheet } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { useT } from '@/lib/i18n/I18nContext';
import { SyncedIcon, UnsyncedIcon, ImportIcon, type SyncIconProps } from '@/shared/icons/sync-icons';
import { radius } from '@/theme/tokens';

// Visual badge for a sync state. Two shapes:
//
//   - `pill`: white round badge containing the cloud icon. Used for the
//     attention-grabbing states on books (unsynced / toImport).
//   - `dot`:  small solid coloured circle. Quieter — used for the synced
//     state on books and for the per-card / per-deck unsynced indicator.
//
// Default rendering picks automatically: synced → dot, others → pill.
// Callers can force `variant="dot"` (decks/cards do this for their
// unsynced indicator). Tapping any pill shows a short explanation alert,
// worded by `library.syncState.<state>` — whose title is also the default
// accessibility label.

export type SyncPillState = 'synced' | 'unsynced' | 'toImport';

const CONFIG: Record<SyncPillState, { color: string; Icon: ComponentType<SyncIconProps> }> = {
  synced: { color: '#2E9F58', Icon: SyncedIcon },
  unsynced: { color: '#1E3D6B', Icon: UnsyncedIcon },
  toImport: { color: '#6B6661', Icon: ImportIcon },
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
  const t = useT();
  const cfg = CONFIG[state];
  const Icon = cfg.Icon;
  const title = t(`library.syncState.${state}.title`);
  const effectiveVariant: 'pill' | 'dot' = variant ?? (state === 'synced' ? 'dot' : 'pill');

  // No hitSlop — the pill sits on top of a tappable book tile, and any
  // expansion of the touch area would steal taps from the parent. Keep
  // the press strictly to the visible pixels.
  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    Alert.alert(title, t(`library.syncState.${state}.body`));
  };

  if (effectiveVariant === 'dot') {
    return (
      <Touchable
        minTarget={false}
        hitSlop={12}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={label ?? title}
        style={[styles.dot, { backgroundColor: cfg.color }]}
      />
    );
  }

  return (
    <Touchable
      minTarget={false}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      style={[
        styles.pill,
        {
          backgroundColor: 'white',
          borderColor: 'white',
        },
      ]}
    >
      <Icon size={18} color={cfg.color} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    borderRadius: radius.pill,
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
