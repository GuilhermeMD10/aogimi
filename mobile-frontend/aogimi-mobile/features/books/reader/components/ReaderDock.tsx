import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableBackdrop, Touchable } from '@/shared/components/Touchable';
import { MoreDotsIcon } from '@/shared/icons/dots';
import { usePalette, radius, spacing, type } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import {
  readerChrome,
  type ReaderChrome,
  type EpubTocItem,
  type ReaderPrefs,
  type ReaderTheme,
} from '../lib';
import { TocSheet, ConfigsSheet, type MangaConfig } from './sheets';

// ─────────────────────────────────────────────────────────────────────────────
// Geometry — every figure from `Reader.dc.html`'s dock component strip.
// ─────────────────────────────────────────────────────────────────────────────

/** IDLE · 64×40 · R12. */
const IDLE_W = 64;
const IDLE_H = 40;

/** PRESSED · 3 shortcuts · R12. The bar is 64 tall with 6pt of padding; each
 *  cell is 72×52. */
const BAR_H = 64;
const BAR_PAD = 6;
const CELL_W = 72;
const CELL_H = 52;

/** WORD SELECTED · 40 / 64 / 40 · GAP 16. */
const ACTION = 40;
const ACTION_PRIMARY = 64;
const ACTION_GAP = 16;

/** How far the cluster floats above the safe area. The composition puts it 44pt
 *  from the frame's bottom edge, which on a device with a home indicator is the
 *  inset plus roughly this. */
const LIFT = spacing.md;

/** The blur behind the dock. Tier 3's `blur(32px) saturate(180%)` on
 *  `expo-blur`'s 1–100 scale — see `BLUR_BY_TIER` in `theme/glass.ts`. The dock
 *  does not read the tier recipe because its wash comes from the page, not the
 *  palette (see `readerChrome`), but the blur radius is the same object. */
const BLUR = 34;

export type ReaderDockProps = {
  /**
   * The reader theme the page is painted in. Drives the dock's whole material —
   * see `readerChrome`. Callers with no reader theme (the PDF shell, which
   * renders on the app canvas) pass the app's polarity instead.
   */
  theme: ReaderTheme;

  /**
   * **Is there a live text selection?**
   *
   * The one flag that swaps the dock for the three selection actions. It is a
   * boolean and not a payload on purpose: the dock does not need to know what
   * is selected, only that something is, and the three callbacks below already
   * close over the selection in the screen that owns it.
   */
  selected?: boolean;
  /** Tap-anywhere-else while a selection is live. Clears it. */
  onDismissSelection?: () => void;
  onAddCard?: () => void;
  /** Look the selection up — the big sakura circle. */
  onLookUp?: () => void;
  onCopy?: () => void;

  /** Chapter list. The TOC shortcut appears only when there is one to show. */
  toc?: {
    items: EpubTocItem[];
    /** The href foliate last reported, so the sheet can mark where you are. */
    currentHref?: string;
    onNavigate: (href: string) => void;
  };
  /** Display settings. The Configs shortcut appears only when passed. */
  configs?: {
    prefs: ReaderPrefs;
    onChange: (patch: Partial<ReaderPrefs>) => void;
    /** Present for a fixed-layout book: swaps the typography rows for the
     *  manga layout and direction toggles. */
    manga?: MangaConfig;
  };
  /** Open the lookup sheet with nothing queried. Every reader has this. */
  onOpenDictionary: () => void;
};

/**
 * **The reader's dock.** One cluster, three states, and nothing else on screen.
 *
 *   IDLE      a 64×40 grip with three dots
 *   SHORTCUTS TOC · Configs · Dictionary, in 72×52 cells
 *   SELECTION add card · look up · copy, as 40 / 64 / 40 circles
 *
 * ── What it stopped being ──────────────────────────────────────────────────
 * It used to be one container that morphed through four modes and *was* the
 * TOC and the settings panes — a 70%-tall sheet with its own backdrop, its own
 * swipe-to-close and its own step-back ladder, none of which `BottomSheet`'s
 * equivalents. It also carried page-turn chevrons at its edges, which the
 * redesign drops: a reflowable book turns by tapping or swiping the page, and
 * two arrows in the chrome spent a third of the dock restating that.
 *
 * Now it is only the cluster. The two sheets are `BottomSheet`s (see
 * `sheets/`), so there is one scrim, one grabber and one dismiss gesture in the
 * app rather than two implementations of each.
 *
 * ── Why the mode is derived rather than stored ─────────────────────────────
 * `open` is the only state here, and the mode is computed from it and
 * `selected`. A selection therefore *takes over* the dock without having to
 * push the expanded row back down through an effect — which is the version of
 * this that needs `useEffect` and trips `react-hooks/set-state-in-effect`. The
 * stale case (selection ends while `open` is still true, so the shortcut row
 * reappears) needs a selection to have begun *while the row was expanded*, and
 * it cannot: the expanded row is behind a full-screen dismiss backdrop, so the
 * first touch on the page collapses it instead of starting a hold.
 */
export function ReaderDock({
  theme,
  selected = false,
  onDismissSelection,
  onAddCard,
  onLookUp,
  onCopy,
  toc,
  configs,
  onOpenDictionary,
}: ReaderDockProps) {
  const p = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const chrome = useMemo(() => readerChrome(theme), [theme]);
  const s = useStyles(chrome);

  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<'toc' | 'configs' | null>(null);

  // Absolute insets in RN resolve against the parent's *padding* box, so the
  // lift is a margin on the cluster rather than padding on the host — padding
  // would pull the dismiss backdrop up off the bottom of the screen with it.
  const lift = insets.bottom + LIFT;

  const mode: 'idle' | 'shortcuts' | 'selection' = selected
    ? 'selection'
    : open
      ? 'shortcuts'
      : 'idle';

  /** Every shortcut collapses the dock before it acts, so the cluster is never
   *  left expanded under a sheet it opened. */
  const run = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  const hasToc = toc !== undefined && toc.items.length > 0;

  return (
    <>
      <View style={s.host} pointerEvents="box-none">
        {/* Outside-tap: collapses the shortcut row, or clears the selection.
            Both are "the reader is done with this", and both have to swallow
            the tap so it does not also turn the page. */}
        {mode === 'shortcuts' && (
          <PressableBackdrop style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        )}
        {mode === 'selection' && onDismissSelection && (
          <PressableBackdrop style={StyleSheet.absoluteFill} onPress={onDismissSelection} />
        )}

        {mode === 'idle' && (
          <Touchable
            minTarget={false}
            hitSlop={10}
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('reader.dock.open')}
            style={[s.pane, s.idle, { marginBottom: lift }]}
          >
            <Wash chrome={chrome} radius={radius.control} />
            <MoreDotsIcon size={4} gap={4} color={chrome.ink} />
          </Touchable>
        )}

        {mode === 'shortcuts' && (
          <View style={[s.pane, s.bar, { marginBottom: lift }]}>
            <Wash chrome={chrome} radius={radius.control} />
            {hasToc && (
              <Cell
                chrome={chrome}
                icon="align-left"
                label={t('reader.dock.toc')}
                onPress={() => run(() => setSheet('toc'))}
              />
            )}
            {configs && (
              <Cell
                chrome={chrome}
                icon="sliders"
                label={t('reader.dock.configs')}
                onPress={() => run(() => setSheet('configs'))}
              />
            )}
            <Cell
              chrome={chrome}
              icon="book-open"
              label={t('reader.dock.dictionary')}
              onPress={() => run(onOpenDictionary)}
            />
          </View>
        )}

        {mode === 'selection' && (
          <View style={[s.actions, { marginBottom: lift }]}>
            <ActionCircle
              chrome={chrome}
              size={ACTION}
              icon="plus-square"
              label={t('reader.selection.addCard')}
              onPress={onAddCard}
            />
            {/* The one sakura fill in the reader. DESIGN.md's primary pair
                (`btn` on `btnInk`) is the app's highest-contrast combination,
                which is what lets it sit on a light, sepia or dark page
                unchanged while everything around it follows the page. */}
            <ActionCircle
              chrome={chrome}
              size={ACTION_PRIMARY}
              icon="book-open"
              label={t('reader.selection.lookUp')}
              onPress={onLookUp}
              fill={p.btn}
              ink={p.btnInk}
              glow={p.glowPrimary}
            />
            <ActionCircle
              chrome={chrome}
              size={ACTION}
              icon="copy"
              label={t('reader.selection.copy')}
              onPress={onCopy}
            />
          </View>
        )}
      </View>

      {toc && (
        <TocSheet
          visible={sheet === 'toc'}
          onDismiss={() => setSheet(null)}
          toc={toc.items}
          currentHref={toc.currentHref}
          onNavigate={(href) => {
            setSheet(null);
            toc.onNavigate(href);
          }}
        />
      )}

      {configs && (
        <ConfigsSheet
          visible={sheet === 'configs'}
          onDismiss={() => setSheet(null)}
          prefs={configs.prefs}
          onChange={configs.onChange}
          manga={configs.manga}
        />
      )}
    </>
  );
}

/**
 * The pane's wash: fill, a uniform hairline and the live blur, as an
 * absolutely-positioned layer. No specular top edge — see `Glass`.
 *
 * A layer rather than styles on the parent, because the blur has to be clipped
 * to the rounded corners and clipping a parent on iOS also clips its own drop
 * shadow — the one thing separating the dock from the page it floats on.
 */
function Wash({ chrome, radius: r }: { chrome: ReaderChrome; radius: number }) {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: r,
          overflow: 'hidden',
          backgroundColor: chrome.fill,
          borderWidth: 1,
          borderColor: chrome.bd,
        },
      ]}
    >
      <BlurView intensity={BLUR} tint={chrome.blurTint} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/** One 72×52 shortcut: a 20pt glyph over a 10pt label. */
function Cell({
  chrome,
  icon,
  label,
  onPress,
}: {
  chrome: ReaderChrome;
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
}) {
  const s = useStyles(chrome);
  return (
    <Touchable
      minTarget={false}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={s.cell}
    >
      <Feather name={icon} size={20} color={chrome.ink} />
      <Text numberOfLines={1} style={s.cellLabel}>
        {label}
      </Text>
    </Touchable>
  );
}

/**
 * One selection action. Takes the page's wash by default; the middle one takes
 * the sakura fill and the CTA glow instead.
 */
function ActionCircle({
  chrome,
  size,
  icon,
  label,
  onPress,
  fill,
  ink,
  glow,
}: {
  chrome: ReaderChrome;
  size: number;
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress?: () => void;
  fill?: string;
  ink?: string;
  glow?: string;
}) {
  const filled = fill !== undefined;
  return (
    <Touchable
      minTarget={false}
      // The 40pt circles are under the 44pt floor and must not grow — the trio's
      // 40/64/40 rhythm is the design — so they take slop instead.
      hitSlop={size < 44 ? 6 : 0}
      onPress={onPress}
      disabled={onPress === undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        circleStyle(size),
        filled && {
          backgroundColor: fill,
          shadowColor: glow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 1,
          shadowRadius: 24,
          elevation: 6,
        },
        !filled && {
          shadowColor: chrome.shadowColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: chrome.shadowOpacity,
          shadowRadius: 16,
          elevation: 4,
        },
      ]}
    >
      {!filled && <Wash chrome={chrome} radius={size / 2} />}
      <Feather
        name={icon}
        size={size >= ACTION_PRIMARY ? 26 : 18}
        color={ink ?? chrome.ink}
      />
    </Touchable>
  );
}

/** A circle is half its own box, by definition — not a token radius. */
function circleStyle(size: number): StyleProp<ViewStyle> {
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

function useStyles(chrome: ReaderChrome) {
  return useMemo(
    () =>
      StyleSheet.create({
        // Fills the reader, passes touches through, and pins the cluster to the
        // bottom centre. `paddingBottom` comes from the call site because the
        // safe-area inset is not a constant.
        host: {
          ...StyleSheet.absoluteFillObject,
          justifyContent: 'flex-end',
          alignItems: 'center',
        },

        // The shared part of every pane: it casts, `Wash` clips.
        pane: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.control,
          shadowColor: chrome.shadowColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: chrome.shadowOpacity,
          shadowRadius: 16,
          elevation: 4,
        },
        idle: { width: IDLE_W, height: IDLE_H },
        bar: { height: BAR_H, padding: BAR_PAD, gap: 4 },

        cell: {
          width: CELL_W,
          height: CELL_H,
          borderRadius: radius.control,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
        },
        cellLabel: {
          ...type.eyebrow,
          letterSpacing: 0.4,
          textTransform: 'none',
          color: chrome.inkMuted,
        },

        actions: { flexDirection: 'row', alignItems: 'center', gap: ACTION_GAP },
      }),
    [chrome],
  );
}
