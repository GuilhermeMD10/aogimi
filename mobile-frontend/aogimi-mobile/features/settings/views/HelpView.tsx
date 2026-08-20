import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Screen } from '@/shared/components/Screen';
import { BackBar } from '@/shared/components/BackBar';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { SyncedIcon, UnsyncedIcon, ImportIcon } from '@/shared/icons/sync-icons';

// Help — explains what the app is and the bits that aren't obvious from
// poking around (sync states in particular). Prose-heavy on purpose; this
// is the page someone reads ONCE.

const SYNC_GREEN = '#2E9F58';
const SYNC_BLUE = '#1E3D6B';
const SYNC_GREY = '#6B6661';

export function HelpView() {
  const c = useColors();
  const router = useRouter();

  return (
    <Screen padded>
      <BackBar title="Help" />

      <ScrollView contentContainerStyle={styles.body}>
        <Section heading="What is Aogimi?" fg={c.fg} fgMuted={c.fgMuted} pinned>
          <P fgMuted={c.fgMuted}>
            Aogimi is a Japanese reading and vocabulary companion. Open an EPUB or PDF, look up any word in the
            built-in dictionary with a single gesture, save what you want to remember to a flashcard deck, and pick up
            where you left off on any of your devices.
          </P>
        </Section>

        <Section heading="Reading a book" fg={c.fg} fgMuted={c.fgMuted}>
          <P fgMuted={c.fgMuted}>
            Tap a book on the home screen to open it. The reader supports reflowable EPUBs (novels, light novels) and
            PDFs.
          </P>
          <P fgMuted={c.fgMuted}>
            To look up a word: press and hold on it, then drag to extend the selection if you need to. When you lift
            your finger a small action bar appears with shortcuts for Dictionary, Card, and Copy.
          </P>
          <P fgMuted={c.fgMuted}>
            The bottom dock has chapter navigation and typography settings. The floating chevron at the
            bottom-left takes you back to the library.
          </P>
        </Section>

        <Section heading="Dictionary" fg={c.fg} fgMuted={c.fgMuted}>
          <P fgMuted={c.fgMuted}>
            Word entries come from JMdict, kanji info from KANJIDIC2, names from JMnedict, and example sentences and
            pitch accents from the Kanjium project. Open the Dictionary tab to search at any time, or tap Dict from a
            selection inside the reader.
          </P>
        </Section>

        <Section heading="Flashcard decks" fg={c.fg} fgMuted={c.fgMuted}>
          <P fgMuted={c.fgMuted}>
            Decks live in the Decks tab. Add a card from any text selection by tapping Card. Each card stays linked to
            its dictionary entry so the reading and meaning stay in sync if the entry changes upstream.
          </P>
        </Section>

        <Section heading="How sync works" fg={c.fg} fgMuted={c.fgMuted}>
          <P fgMuted={c.fgMuted}>
            Your books and reading positions are saved to your account. Each device keeps a
            local copy and pushes changes to the backend opportunistically when it&apos;s online. If you import a book while
            offline, it stays on this device — marked as unsynced — until the next sync round.
          </P>
          <P fgMuted={c.fgMuted}>The cloud badge in the corner of each book tile tells you where that book stands:</P>
        </Section>

        <View style={[styles.legend, { borderColor: c.border }]}>
          <LegendRow
            fg={c.fg}
            fgMuted={c.fgMuted}
            borderColor={c.border}
            icon={<SyncedIcon size={20} color={SYNC_GREEN} />}
            title="Synced"
            body="This book’s progress is synced across devices!"
          />
          <LegendRow
            fg={c.fg}
            fgMuted={c.fgMuted}
            borderColor={c.border}
            icon={<UnsyncedIcon size={20} color={SYNC_BLUE} />}
            title="Not synced"
            body="Either the book was imported offline, or a recent reading-progress wasn't saved to your library. When online, use Sync now to push it."
          />
          <LegendRow
            fg={c.fg}
            fgMuted={c.fgMuted}
            borderColor={c.border}
            icon={<ImportIcon size={20} color={SYNC_GREY} />}
            title="On your account"
            isLast
            body="This books progress is in your library, but the file isn't on this device yet. Tap it to import the file."
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
  legendTitle: { fontSize: fontSize.md, fontWeight: '600' },
  legendBody: { fontSize: fontSize.md, marginTop: 2, lineHeight: 17 },
});
