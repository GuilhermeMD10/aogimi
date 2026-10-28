import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Touchable, Screen, BackBar } from '@/shared/components';
import Feather from '@expo/vector-icons/Feather';
import { useColors, fontFamily, fontSize, spacing } from '@/theme';
import { UnsyncedIcon, ImportIcon } from '@/shared/icons/sync-icons';
import { useT } from '@/lib/i18n/I18nContext';

// Help — explains what the app is and the bits that aren't obvious from
// poking around (sync states in particular). Prose-heavy on purpose; this
// is the page someone reads ONCE. Every string is in `help.*` of the locale
// files, and it describes only what the app does today.

// The library tile's badge colours (`SyncPill`), so the legend matches what
// the shelf actually draws: a dot for synced, a cloud pill for the other two.
const SYNC_GREEN = '#2E9F58';
const SYNC_BLUE = '#1E3D6B';
const SYNC_GREY = '#6B6661';

/** The paragraph keys of each collapsible section, in reading order. */
const SECTIONS: { key: string; paragraphs: string[] }[] = [
  { key: 'reading', paragraphs: ['library', 'lookup', 'dock'] },
  { key: 'dictionary', paragraphs: ['body', 'sources'] },
  { key: 'sky', paragraphs: ['body', 'using'] },
  { key: 'study', paragraphs: ['body', 'due'] },
  { key: 'account', paragraphs: ['body', 'delete'] },
];

export function HelpView() {
  const c = useColors();
  const t = useT();

  return (
    <Screen padded>
      <BackBar title={t('settings.help')} />

      <ScrollView contentContainerStyle={styles.body}>
        <Section heading={t('help.intro.heading')} fg={c.fg} fgMuted={c.fgMuted} pinned>
          <P fgMuted={c.fgMuted}>{t('help.intro.body')}</P>
          <P fgMuted={c.fgMuted}>{t('help.intro.tabs')}</P>
        </Section>

        {SECTIONS.map(({ key, paragraphs }) => (
          <Section key={key} heading={t(`help.${key}.heading`)} fg={c.fg} fgMuted={c.fgMuted}>
            {paragraphs.map((para) => (
              <P key={para} fgMuted={c.fgMuted}>
                {t(`help.${key}.${para}`)}
              </P>
            ))}
          </Section>
        ))}

        <Section heading={t('help.sync.heading')} fg={c.fg} fgMuted={c.fgMuted}>
          <P fgMuted={c.fgMuted}>{t('help.sync.body')}</P>
          <P fgMuted={c.fgMuted}>{t('help.sync.legend')}</P>
        </Section>

        <View style={[styles.legend, { borderColor: c.border }]}>
          <LegendRow
            fg={c.fg}
            fgMuted={c.fgMuted}
            borderColor={c.border}
            icon={
              <View style={styles.dotSlot}>
                <View style={[styles.dot, { backgroundColor: SYNC_GREEN }]} />
              </View>
            }
            title={t('help.sync.synced.title')}
            body={t('help.sync.synced.body')}
          />
          <LegendRow
            fg={c.fg}
            fgMuted={c.fgMuted}
            borderColor={c.border}
            icon={<UnsyncedIcon size={20} color={SYNC_BLUE} />}
            title={t('help.sync.unsynced.title')}
            body={t('help.sync.unsynced.body')}
          />
          <LegendRow
            fg={c.fg}
            fgMuted={c.fgMuted}
            borderColor={c.border}
            icon={<ImportIcon size={20} color={SYNC_GREY} />}
            title={t('help.sync.toImport.title')}
            isLast
            body={t('help.sync.toImport.body')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({
  heading,
  children,
  fg,
  fgMuted,
  pinned,
}: {
  heading: string;
  children: React.ReactNode;
  fg: string;
  fgMuted: string;
  /** When true, render always-expanded with no toggle. Used for the
   *  orientation section ("What is Aogimi?") that should never hide. */
  pinned?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const expanded = pinned || open;

  const headingRow = (
    <View style={styles.headingRow}>
      <Text style={[styles.sectionHeading, { color: fg, fontFamily: fontFamily.ui }]}>{heading}</Text>
      {!pinned && <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={fgMuted} />}
    </View>
  );

  return (
    <View style={styles.section}>
      {pinned ? (
        headingRow
      ) : (
        <Touchable
        minTarget={false} onPress={() => setOpen((v) => !v)}>
          {headingRow}
        </Touchable>
      )}
      {expanded && children}
    </View>
  );
}

function P({ children, fgMuted }: { children: React.ReactNode; fgMuted: string }) {
  return <Text style={[styles.paragraph, { color: fgMuted }]}>{children}</Text>;
}

function LegendRow({
  icon,
  title,
  body,
  isLast,
  fg,
  fgMuted,
  borderColor,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  isLast?: boolean;
  fg: string;
  fgMuted: string;
  borderColor: string;
}) {
  return (
    <View
      style={[
        styles.legendRow,
        {
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderColor,
        },
      ]}
    >
      <View style={styles.legendIcon}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.legendTitle, { color: fg }]}>{title}</Text>
        <Text style={[styles.legendBody, { color: fgMuted }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.md, gap: spacing.xl },
  section: { gap: spacing.md },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionHeading: { fontSize: fontSize.lg, fontWeight: '600', flexShrink: 1 },
  paragraph: { fontSize: fontSize.md, lineHeight: 20 },
  legend: {
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  legendIcon: { paddingTop: 2 },
  /** The synced dot in the 20pt box the two icons occupy, so the text column
   *  lines up across all three rows. */
  dotSlot: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendTitle: { fontSize: fontSize.md, fontWeight: '600' },
  legendBody: { fontSize: fontSize.md, marginTop: 2, lineHeight: 17 },
});
