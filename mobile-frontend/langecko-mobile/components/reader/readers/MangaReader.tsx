import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { TocSheet } from '../TocSheet';
import { AnnotationsSheet } from '../AnnotationsSheet';
import type { EpubTocItem, ReaderViewMode } from '../epubHtml';
import type { EpubBookmark } from '@/lib/readerStorage';

type Sheet = 'toc' | 'annotations' | null;

export type MangaReaderProps = {
  toc: EpubTocItem[];
  bookmarks: EpubBookmark[];
  isBookmarked: boolean;
  viewMode: ReaderViewMode;
  onPrev: () => void;
  onNext: () => void;
  onJumpHref: (href: string) => void;
  onJumpCfi: (cfi: string) => void;
  onToggleBookmark: () => void;
  onDeleteBookmark: (id: string) => void;
  onSetViewMode: (mode: ReaderViewMode) => void;
};

const VIEW_MODES: { key: ReaderViewMode; label: string }[] = [
  { key: 'single', label: '1' },
  { key: 'double', label: '2' },
  { key: 'scroll', label: '∞' },
];

/**
 * Manga reader overlay — fixed-layout pages, RTL navigation, view-mode
 * toggle (single / double-page spread / scroll). No typography or text
 * features (manga has no selectable text).
 */
export function MangaReader({
  toc,
  bookmarks,
  isBookmarked,
  viewMode,
  onPrev,
  onNext,
  onJumpHref,
  onJumpCfi,
  onToggleBookmark,
  onDeleteBookmark,
  onSetViewMode,
}: MangaReaderProps) {
  const c = useColors();
  const [sheet, setSheet] = useState<Sheet>(null);

  return (
    <>
      <View pointerEvents="box-none" style={styles.host}>
        <View style={[styles.bar, { backgroundColor: c.bgElev, borderColor: c.borderStrong }]}>
          {/* Manga is RTL: left button advances */}
          <Btn label="‹" onPress={onNext} c={c} />
          <Btn label="›" onPress={onPrev} c={c} />

          <Divider c={c} />

          <Btn
            label="☰"
            onPress={() => setSheet((s) => (s === 'toc' ? null : 'toc'))}
            active={sheet === 'toc'}
            c={c}
          />
          <Btn
            label="★"
            onPress={() => setSheet((s) => (s === 'annotations' ? null : 'annotations'))}
            active={sheet === 'annotations'}
            c={c}
          />
          <Btn label={isBookmarked ? '●' : '+'} onPress={onToggleBookmark} active={isBookmarked} c={c} />

          <Divider c={c} />

          {/* View mode toggle */}
          {VIEW_MODES.map((m) => (
            <Btn
              key={m.key}
              label={m.label}
              onPress={() => onSetViewMode(m.key)}
              active={viewMode === m.key}
              small
              c={c}
            />
          ))}
        </View>
      </View>

      <TocSheet visible={sheet === 'toc'} toc={toc} onDismiss={() => setSheet(null)} onNavigate={onJumpHref} />

      <AnnotationsSheet
        visible={sheet === 'annotations'}
        bookmarks={bookmarks}
        highlights={[]}
        onDismiss={() => setSheet(null)}
        onJumpBookmark={(b) => onJumpCfi(b.cfi)}
        onDeleteBookmark={onDeleteBookmark}
        onJumpHighlight={() => undefined}
        onDeleteHighlight={() => undefined}
      />
    </>
  );
}

function Btn({
  label,
  onPress,
  active,
  small,
  c,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  small?: boolean;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.btn, small ? styles.btnSmall : undefined, active && { backgroundColor: c.accentSoft }]}
      hitSlop={4}
    >
      <Text style={[styles.label, { color: active ? c.accent : c.fg }, small && styles.labelSmall]}>{label}</Text>
    </Pressable>
  );
}

function Divider({ c }: { c: ReturnType<typeof useColors> }) {
  return <View style={[styles.divider, { backgroundColor: c.border }]} />;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  btn: {
    minWidth: 36,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: { minWidth: 28, paddingHorizontal: 6 },
  label: { fontSize: 16, fontWeight: '500', lineHeight: 18 },
  labelSmall: { fontSize: 12, fontWeight: '600' },
  divider: { width: StyleSheet.hairlineWidth, height: 18, marginHorizontal: 4 },
});
