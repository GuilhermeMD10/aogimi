import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';

export type ReaderSettings = {
  fontPx: number;
  lineHeightMul: number;
  vertical: boolean;
};

type Props = {
  expanded: boolean;
  settings: ReaderSettings;
  onToggleExpanded: () => void;
  onChange: (patch: Partial<ReaderSettings>) => void;
};

const FONT_MIN = 14;
const FONT_MAX = 28;

export function ReaderToolbar({ expanded, settings, onToggleExpanded, onChange }: Props) {
  if (expanded) return <ExpandedToolbar settings={settings} onToggleExpanded={onToggleExpanded} onChange={onChange} />;
  return <CollapsedToolbar onTap={onToggleExpanded} />;
}

function CollapsedToolbar({ onTap }: { onTap: () => void }) {
  const c = useColors();
  return (
    <View pointerEvents="box-none" style={styles.collapsedHost}>
      <Pressable
        onPress={onTap}
        style={[
          styles.pill,
          {
            backgroundColor: c.bgElev,
            borderColor: c.border,
          },
        ]}
      >
        <Text style={[styles.pillIcon, { color: c.fg }]}>Aa</Text>
        <View style={[styles.pillDivider, { backgroundColor: c.border }]} />
        <Text style={[styles.pillIcon, { color: c.fg }]}>☰</Text>
        <View style={[styles.pillDivider, { backgroundColor: c.border }]} />
        <Text style={[styles.pillIcon, { color: c.fg }]}>⇅</Text>
        <View style={[styles.pillDivider, { backgroundColor: c.border }]} />
        <Text style={[styles.pillIcon, { color: c.fg }]}>☀</Text>
      </Pressable>
    </View>
  );
}

function ExpandedToolbar({
  settings,
  onToggleExpanded,
  onChange,
}: {
  settings: ReaderSettings;
  onToggleExpanded: () => void;
  onChange: (patch: Partial<ReaderSettings>) => void;
}) {
  const c = useColors();

  const bumpFont = (d: number) => {
    const next = Math.max(FONT_MIN, Math.min(FONT_MAX, settings.fontPx + d));
    onChange({ fontPx: next });
  };

  return (
    <View pointerEvents="box-none" style={styles.expandedHost}>
      <View
        style={[
          styles.panel,
          { backgroundColor: c.bgElev, borderColor: c.border },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.fg }]}>Reading</Text>
          <Pressable onPress={onToggleExpanded} hitSlop={8}>
            <Text style={[styles.close, { color: c.fgMuted }]}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <View style={[styles.controlBlock, { backgroundColor: c.bgSunken }]}>
            <Pressable onPress={() => bumpFont(-2)} hitSlop={8}>
              <Text style={[styles.controlIcon, { color: c.fg }]}>−</Text>
            </Pressable>
            <Text style={[styles.controlA, { color: c.fg, fontSize: settings.fontPx }]}>A</Text>
            <Pressable onPress={() => bumpFont(2)} hitSlop={8}>
              <Text style={[styles.controlIcon, { color: c.fg }]}>+</Text>
            </Pressable>
          </View>

          <View style={[styles.controlBlock, { backgroundColor: c.bgSunken, flex: 1, justifyContent: 'center' }]}>
            <Pressable
              onPress={() =>
                onChange({
                  lineHeightMul: settings.lineHeightMul >= 2.3 ? 1.7 : settings.lineHeightMul + 0.15,
                })
              }
              hitSlop={8}
            >
              <Text style={[styles.controlIcon, { color: c.fg }]}>☰</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.row}>
          <DirectionTile
            label="横書き"
            sub="Horizontal"
            active={!settings.vertical}
            onPress={() => onChange({ vertical: false })}
          />
          <DirectionTile
            label="縦書き"
            sub="Vertical"
            active={settings.vertical}
            onPress={() => onChange({ vertical: true })}
          />
        </View>
      </View>
    </View>
  );
}

function DirectionTile({
  label,
  sub,
  active,
  onPress,
}: {
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tile,
        {
          backgroundColor: active ? c.fg : c.bgSunken,
        },
      ]}
    >
      <Text style={[styles.tileLabel, { color: active ? c.accentFg : c.fg, fontFamily: fontFamily.jp }]}>
        {label}
      </Text>
      <Text style={[styles.tileSub, { color: active ? c.accentFg : c.fgMuted }]}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  collapsedHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  pillIcon: { fontSize: 16, paddingHorizontal: 2 },
  pillDivider: { width: StyleSheet.hairlineWidth, height: 18 },
  expandedHost: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 28,
  },
  panel: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { fontSize: fontSize.md, fontWeight: '600' },
  close: { fontSize: 18 },
  row: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  controlBlock: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlIcon: { fontSize: 18, paddingHorizontal: 8 },
  controlA: { fontFamily: fontFamily.jp, fontWeight: '500' },
  tile: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  tileLabel: { fontSize: 18, fontWeight: '500' },
  tileSub: { fontSize: 11, marginTop: 2 },
});
