import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet, Slider, Touchable } from '@/shared/components';
import { usePalette, radius, spacing, type, type Palette } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import {
  READER_THEMES,
  type ReaderFont,
  type ReaderPrefs,
  type ReaderTheme,
  type MangaPageDir,
} from '../../lib';
import { SheetHeading } from './SheetHeading';

/** `Reader.dc.html`'s Configs drawer: 58% of the screen, 40pt segments, 44pt
 *  theme swatches. */
const HEIGHT_RATIO = 0.58;
const SEGMENT_H = 40;
const SWATCH_H = 44;

/**
 * The font choices, unchanged from the pane this replaces.
 *
 * The handoff's segment is ゴシック / 明朝 / 丸ゴシック; the third needs a JP
 * rounded face the app does not bundle, so the set stays ours — gothic, mincho
 * and the platform sans — and only the control is new. D9 in `REDESIGN-PLAN.md`
 * is the open question about adopting the handoff's four faces and four themes;
 * this pass restyles what exists rather than answering it.
 */
const FONTS: { key: ReaderFont; label: string }[] = [
  { key: 'sans-jp', label: 'ゴシック' },
  { key: 'serif-jp', label: '明朝' },
  { key: 'system', label: 'A' },
];

/** 12–28 in even steps: the pane's old min, max and step, as the slider's
 *  domain. See `Slider` on why it takes the set rather than a range. */
const FONT_SIZES = [12, 14, 16, 18, 20, 22, 24, 26, 28] as const;

/** Five hand-picked ratios, deliberately not evenly spaced. */
const LINE_HEIGHTS = [1.2, 1.5, 1.7, 2.0, 2.3] as const;

const THEME_KEYS: ReaderTheme[] = ['light', 'sepia', 'dark'];

/** Manga-only controls. Absent for a reflowable book, which has neither. */
export type MangaConfig = {
  mode: 'scroll' | 'pages';
  onToggleMode: () => void;
  pageDir: MangaPageDir;
  onTogglePageDir: () => void;
};

/**
 * Reader display settings, as a sheet.
 *
 * ── Sliders, not steppers ──────────────────────────────────────────────────
 * Size and line spacing were `− value +` steppers: two taps to move one step,
 * and nine taps to cross the size range. They are one-dimensional continuous
 * choices that the reader makes by *looking at the page*, so the control should
 * let them sweep and watch — which is what the handoff draws and what `Slider`
 * does, ticking once per step so the discreteness is still felt.
 *
 * ── Where the manga toggles went ───────────────────────────────────────────
 * Scroll-vs-pages and the page direction used to be buttons in the dock's
 * toolbar row. The redesigned dock carries exactly three shortcuts (TOC,
 * Configs, Dictionary) and no per-format extras, so the two toggles moved here,
 * which is where they belonged anyway: they are display settings, and a reader
 * changes them once and forgets them. Nothing was dropped.
 */
export function ConfigsSheet({
  visible,
  onDismiss,
  prefs,
  onChange,
  manga,
}: {
  visible: boolean;
  onDismiss: () => void;
  prefs: ReaderPrefs;
  onChange: (patch: Partial<ReaderPrefs>) => void;
  manga?: MangaConfig;
}) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);

  const themeLabel: Record<ReaderTheme, string> = {
    light: t('reader.configs.themeLight'),
    sepia: t('reader.configs.themeSepia'),
    dark: t('reader.configs.themeDark'),
  };

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={HEIGHT_RATIO}>
      <View style={s.host}>
        <SheetHeading
          mark="読"
          eyebrow={t('reader.configs.eyebrow')}
          title={t('reader.configs.title')}
        />

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {/* Typography is meaningless for fixed-layout manga — the pages are
              images — so those three rows are only offered to a reflowable
              book. `manga` being present is that fact. */}
          {!manga && (
            <>
              <Section label={t('reader.configs.font')}>
                <Segments
                  options={FONTS.map((f) => ({
                    key: f.key,
                    label: f.label,
                    japanese: f.key !== 'system',
                  }))}
                  value={prefs.fontFamily}
                  onSelect={(key) => onChange({ fontFamily: key })}
                />
              </Section>

              <Section label={t('reader.configs.fontSize')}>
                <View style={s.sliderRow}>
                  <Text style={s.hintSmall}>あ</Text>
                  <Slider
                    values={FONT_SIZES}
                    value={prefs.fontPx}
                    onChange={(fontPx) => onChange({ fontPx })}
                    accessibilityLabel={t('reader.configs.fontSize')}
                    style={s.slider}
                  />
                  <Text style={s.hintLarge}>あ</Text>
                </View>
              </Section>

              <Section label={t('reader.configs.lineSpacing')}>
                <View style={s.sliderRow}>
                  <View style={[s.lines, s.linesTight]}>
                    <View style={s.line} />
                    <View style={s.line} />
                  </View>
                  <Slider
                    values={LINE_HEIGHTS}
                    value={prefs.lineHeight}
                    onChange={(lineHeight) => onChange({ lineHeight })}
                    accessibilityLabel={t('reader.configs.lineSpacing')}
                    style={s.slider}
                  />
                  <View style={[s.lines, s.linesLoose]}>
                    <View style={s.line} />
                    <View style={s.line} />
                    <View style={s.line} />
                  </View>
                </View>
              </Section>
            </>
          )}

          <Section label={t('reader.configs.theme')}>
            <View style={s.swatchRow}>
              {THEME_KEYS.map((key) => {
                const active = prefs.theme === key;
                const swatch = READER_THEMES[key];
                return (
                  <Touchable
                    key={key}
                    minTarget={false}
                    onPress={() => onChange({ theme: key })}
                    accessibilityRole="button"
                    accessibilityLabel={themeLabel[key]}
                    accessibilityState={{ selected: active }}
                    style={s.swatchCell}
                  >
                    <View
                      style={[
                        s.swatch,
                        { backgroundColor: swatch.bg },
                        active ? s.swatchActive : s.swatchIdle,
                      ]}
                    >
                      <Text style={[s.swatchGlyph, { color: swatch.fg }]}>あ</Text>
                    </View>
                    <Text style={[s.swatchLabel, active && s.swatchLabelActive]}>
                      {themeLabel[key]}
                    </Text>
                  </Touchable>
                );
              })}
            </View>
          </Section>

          {manga && (
            <>
              <Section label={t('reader.configs.layout')}>
                <Segments
                  options={[
                    { key: 'scroll', label: t('reader.configs.layoutScroll') },
                    { key: 'pages', label: t('reader.configs.layoutPages') },
                  ]}
                  value={manga.mode}
                  onSelect={(next) => {
                    if (next !== manga.mode) manga.onToggleMode();
                  }}
                />
              </Section>

              {/* Reading direction only changes anything in pages mode — in
                  scroll mode the pages stack top to bottom regardless — so the
                  row is only offered where it has an effect. */}
              {manga.mode === 'pages' && (
                <Section label={t('reader.configs.direction')}>
                  <Segments
                    options={[
                      { key: 'rtl', label: t('reader.configs.directionRtl') },
                      { key: 'ltr', label: t('reader.configs.directionLtr') },
                    ]}
                    value={manga.pageDir}
                    onSelect={(next) => {
                      if (next !== manga.pageDir) manga.onTogglePageDir();
                    }}
                  />
                </Section>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const p = usePalette();
  const s = useStyles(p);
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * A row of equal-width choices — the handoff's segmented control: 40pt cells at
 * radius 12, the active one filled sakura with `btnInk`.
 *
 * Generic over the key so a caller gets `onSelect` typed to its own union
 * (`ReaderFont`, `MangaPageDir`) instead of a bare string it has to cast back.
 */
function Segments<K extends string>({
  options,
  value,
  onSelect,
}: {
  options: { key: K; label: string; japanese?: boolean }[];
  value: K;
  onSelect: (key: K) => void;
}) {
  const p = usePalette();
  const s = useStyles(p);
  return (
    <View style={s.segments}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Touchable
            key={o.key}
            minTarget={false}
            onPress={() => onSelect(o.key)}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            surface={active ? 'none' : 'glass'}
            radius={radius.control}
            style={[s.segment, active && s.segmentActive]}
          >
            <Text
              numberOfLines={1}
              style={[
                s.segmentLabel,
                o.japanese && s.segmentLabelJp,
                active && s.segmentLabelActive,
              ]}
            >
              {o.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        host: { flex: 1, paddingHorizontal: spacing.screenX, gap: spacing.stackGap },
        body: { gap: spacing.xl, paddingBottom: spacing.xl },

        section: { gap: spacing.sm },
        sectionLabel: {
          ...type.bodySm,
          fontFamily: type.headlineMd.fontFamily,
          color: p.ink,
        },

        segments: { flexDirection: 'row', gap: spacing.sm },
        segment: {
          flex: 1,
          height: SEGMENT_H,
          borderRadius: radius.control,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.sm,
        },
        segmentActive: { backgroundColor: p.btn },
        segmentLabel: {
          ...type.bodySm,
          fontFamily: type.headerTitle.fontFamily,
          color: p.ink,
        },
        segmentLabelJp: { fontFamily: type.titleReading.fontFamily, fontSize: 13 },
        segmentLabelActive: { color: p.btnInk },

        sliderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
        slider: { flex: 1 },
        // The two ends of the size range, drawn as the thing being sized.
        hintSmall: { fontFamily: type.titleReading.fontFamily, fontSize: 11, color: p.faint },
        hintLarge: { fontFamily: type.titleReading.fontFamily, fontSize: 17, color: p.faint },
        // …and the two ends of the spacing range, drawn as stacked rules: a
        // glyph would have said "size" again.
        lines: { width: 16, alignItems: 'stretch' },
        linesTight: { gap: 3 },
        linesLoose: { gap: 5 },
        line: { height: 1.5, borderRadius: 1, backgroundColor: p.faint },

        swatchRow: { flexDirection: 'row', gap: spacing.sm + 2 },
        swatchCell: { flex: 1, alignItems: 'center', gap: 6 },
        swatch: {
          width: '100%',
          height: SWATCH_H,
          borderRadius: radius.control,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // A 2pt accent ring marks the chosen page; the others take the ordinary
        // hairline, so the ring is the only thing that reads as a selection.
        swatchActive: { borderWidth: 2, borderColor: p.accent },
        swatchIdle: { borderWidth: 1, borderColor: p.glassBorder },
        swatchGlyph: { fontFamily: type.titleReading.fontFamily, fontSize: 15 },
        swatchLabel: { ...type.eyebrow, letterSpacing: 0, color: p.faint },
        swatchLabelActive: { color: p.accent },
      }),
    [p],
  );
}
