import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { Glass } from '@/shared/components/Glass';
import { Touchable } from '@/shared/components/Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { radius, spacing, type, type Palette } from '@/theme/tokens';
import type { EpubTocItem } from '../../lib/foliateHtml';
import { SheetHeading } from './SheetHeading';

/** `Reader.dc.html`'s TOC drawer: 46% of the screen, 48pt rows. */
const HEIGHT_RATIO = 0.46;
const ROW_H = 48;

/**
 * The table of contents, as a sheet.
 *
 * It used to be a *pane inside the dock* — the dock grew to 70% of the screen
 * and drew the list itself, with its own backdrop and its own step-back rules.
 * Now the dock is only ever the button cluster and the list is a plain
 * `BottomSheet`, which is what every other list-in-an-overlay in the app
 * already is: one scrim, one grabber, one dismiss gesture, no second
 * implementation of any of them.
 *
 * **The current chapter is marked.** Foliate reports `chapterHref` on every
 * relocate, so the row the reader is actually in takes accent glass and accent
 * ink. Without it a long TOC gives no clue where you are, which is most of what
 * a reader opens one for.
 */
export function TocSheet({
  visible,
  onDismiss,
  toc,
  currentHref,
  onNavigate,
}: {
  visible: boolean;
  onDismiss: () => void;
  toc: EpubTocItem[];
  /** The href foliate last reported for the visible page, if any. */
  currentHref?: string;
  onNavigate: (href: string) => void;
}) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={HEIGHT_RATIO}>
      <View style={s.host}>
        <SheetHeading mark="読" eyebrow={t('reader.toc.eyebrow')} title={t('reader.toc.title')} />

        {toc.length === 0 ? (
          <Text style={s.empty}>{t('reader.toc.empty')}</Text>
        ) : (
          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {toc.map((item, i) => {
              const current = currentHref !== undefined && item.href === currentHref;
              return (
                <Touchable
                  key={`${item.href}-${i}`}
                  minTarget={false}
                  onPress={() => onNavigate(item.href)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label || item.href}
                  accessibilityState={{ selected: current }}
                >
                  <Glass
                    material={current ? 'accent' : 'tier'}
                    tier={1}
                    radius={radius.control}
                    shadow={false}
                    style={s.row}
                  >
                    {/* The chapter's position in the list, not a page number:
                        foliate's TOC carries labels and hrefs and nothing
                        paginated, so there is no page to print. */}
                    <Text style={[s.num, current && s.numCurrent]}>{i + 1}</Text>
                    <Text numberOfLines={1} style={[s.label, current && s.labelCurrent]}>
                      {item.label || item.href}
                    </Text>
                  </Glass>
                </Touchable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        host: { flex: 1, paddingHorizontal: spacing.screenX, gap: spacing.stackGap },
        list: { gap: spacing.sm, paddingBottom: spacing.xl },

        row: {
          height: ROW_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + 2,
          paddingHorizontal: spacing.md + 2,
        },
        num: {
          ...type.titleKanji,
          fontSize: 15,
          lineHeight: 20,
          color: p.muted,
          minWidth: 20,
          fontVariant: ['tabular-nums'],
        },
        numCurrent: { color: p.accent },
        label: {
          ...type.titleReading,
          fontSize: 14,
          lineHeight: 20,
          color: p.muted,
          flex: 1,
        },
        labelCurrent: { color: p.ink },

        empty: {
          ...type.bodySm,
          color: p.muted,
          textAlign: 'center',
          paddingVertical: spacing.xxl,
        },
      }),
    [p],
  );
}
