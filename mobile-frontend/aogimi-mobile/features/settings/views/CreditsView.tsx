import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Screen } from '@/shared/components/Screen';
import { BackBar } from '@/shared/components/BackBar';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { CREDITS, type CreditEntry, type CreditSection } from '@/features/settings/lib/credits';

// Credits page — third-party data sources, fonts, and libraries used by
// the app, grouped by tier (license-strict items first). Each entry shows
// name + license; rows with URLs open in the device browser.

export function CreditsView() {
  const c = useColors();
  const router = useRouter();
  return (
    <Screen padded>
      <BackBar title="Credits" />

      <ScrollView contentContainerStyle={styles.body}>
        {CREDITS.map((section) => (
          <Section
            key={section.heading}
            section={section}
            fg={c.fg}
            fgMuted={c.fgMuted}
            borderColor={c.border}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function Section({
  section,
  fg,
  fgMuted,
  borderColor,
}: {
  section: CreditSection;
  fg: string;
  fgMuted: string;
  borderColor: string;
}) {
  // Pinned sections (the CC BY-SA dictionary credits) render always-open
  // with no toggle. Everything else is a collapsible — title-only by
  // default, body revealed on tap.
  const [open, setOpen] = useState(false);
  const expanded = section.pinned || open;

  const headerInner = (
    <View style={styles.headingRow}>
      <Text style={[styles.sectionHeading, { color: fg, fontFamily: fontFamily.ui }]}>
        {section.heading}
      </Text>
      {!section.pinned && (
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={fgMuted}
        />
      )}
    </View>
  );

  return (
    <View style={styles.section}>
      {section.pinned ? (
        headerInner
      ) : (
        <Touchable
        minTarget={false} onPress={() => setOpen((v) => !v)}>
          {headerInner}
        </Touchable>
      )}

      {expanded && (
        <>
          {section.blurb && (
            <Text style={[styles.sectionBlurb, { color: fgMuted }]}>{section.blurb}</Text>
          )}
          <View style={[styles.entries, { borderColor }]}>
            {section.entries.map((entry, i) => (
              <Entry
                key={entry.name}
                entry={entry}
                isLast={i === section.entries.length - 1}
                fg={fg}
                fgMuted={fgMuted}
                borderColor={borderColor}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function Entry({
  entry,
  isLast,
  fg,
  fgMuted,
  borderColor,
}: {
  entry: CreditEntry;
  isLast: boolean;
  fg: string;
  fgMuted: string;
  borderColor: string;
}) {
  const onPress = entry.url ? () => void Linking.openURL(entry.url!) : undefined;
  return (
    <Touchable
      minTarget={false}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.entry,
        {
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderColor,
        },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.entryName, { color: fg }]}>{entry.name}</Text>
        {entry.owner && (
          <Text style={[styles.entryMeta, { color: fgMuted }]}>{entry.owner}</Text>
        )}
        {entry.note && (
          <Text style={[styles.entryMeta, { color: fgMuted }]}>{entry.note}</Text>
        )}
      </View>
      <Text style={[styles.entryLicense, { color: fgMuted }]}>{entry.license}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xxl, gap: spacing.lg },
  section: { gap: spacing.xs },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionHeading: { fontSize: fontSize.md, fontWeight: '600', flexShrink: 1 },
  sectionBlurb: { fontSize: fontSize.sm, lineHeight: 18 },
  entries: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  entryName: { fontSize: fontSize.sm, fontWeight: '500' },
  entryMeta: { fontSize: fontSize.xs, marginTop: 1 },
  entryLicense: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    letterSpacing: 0.4,
  },
});
