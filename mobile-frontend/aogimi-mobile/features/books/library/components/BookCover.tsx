import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { coverGlyphFor } from '@/lib/coverGlyph';
import { useBookCover } from '../../lib/epubCover';
import { fontFamily, palette, radius } from '@/theme/tokens';

/**
 * The four cover fills and the ink that goes on each, in `palette` order.
 *
 * **Fill and ink are one unit.** They were separate until the 2026-08-12
 * handoff, when the fills went from pale to the handoff's saturated spine
 * colours — and the glyph, which was hardcoded to `palette.ink`, became black
 * on navy. Pairing them here means picking a fill picks its ink and the two
 * cannot drift apart again.
 *
 * **Why the stored `coverColor` is not painted directly.** A book's
 * `cover_color` comes from the backend and is shared with the web app, so the
 * mobile palette can't restyle it. The hex is used as a *key* instead: it picks
 * one of these four pairs, deterministically, which keeps books visually
 * distinct without inventing a colour the backend doesn't know about. Same
 * trick `deckVisuals.deckColorFor` uses for decks. A redesign that settles the
 * cover palette should push those values backend-side and paint the stored hex.
 *
 * These four pairs are **identical in Day and Night** — a saturated ground with
 * pale ink reads in both — which is why this module can still read the static
 * `palette` rather than taking a hook.
 */
const COVER_PAIRS = [
  { fill: palette.cover1, ink: palette.cover1Ink },
  { fill: palette.cover2, ink: palette.cover2Ink },
  { fill: palette.cover3, ink: palette.cover3Ink },
  { fill: palette.cover4, ink: palette.cover4Ink },
] as const;

function coverPairFor(key: string): (typeof COVER_PAIRS)[number] {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return COVER_PAIRS[Math.abs(h) % COVER_PAIRS.length]!;
}

type Props = {
  title: string;
  /** The backend's stored hex. Used as a palette *key*, not painted — see
   *  `COVER_FILLS`. */
  coverColor: string;
  /** When provided, attempts to extract & display the EPUB's embedded cover image. */
  filename?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  style?: ViewStyle;
  cornerRadius?: number;
};

export function BookCover({
  title,
  coverColor,
  filename,
  width,
  height,
  aspectRatio,
  style,
  cornerRadius = radius.md,
}: Props) {
  // EPUB: read the embedded cover out of the OPF. PDF: render page 1 to a
  // JPEG via react-native-pdf-thumbnail. Both write once into covers/ and
  // the hook re-checks disk on every effect run, so a deleted file
  // automatically triggers re-extraction via `retry`.
  const { uri: coverUri, retry } = useBookCover(filename);
  const glyph = coverGlyphFor(title);
  const cover = coverPairFor(coverColor);

  // Once the cover image loads we learn its real width:height and size
  // the shell to match, so the container hugs the artwork instead of
  // pillarboxing a narrow cover inside a fixed-ratio box. Falls back to
  // the caller-supplied `aspectRatio` until the image loads (and for
  // the glyph placeholder when there's no cover). Reset on filename
  // change so a new book doesn't inherit the previous cover's ratio.
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  useEffect(() => {
    setNaturalAspect(null);
  }, [filename]);

  const effectiveAspect = naturalAspect ?? aspectRatio;
  const dims: ViewStyle = {};
  if (width !== undefined) dims.width = width;
  if (height !== undefined) dims.height = height;
  if (effectiveAspect !== undefined) dims.aspectRatio = effectiveAspect;

  return (
    <View
      style={[
        styles.wrap,
        dims,
        { borderRadius: cornerRadius, backgroundColor: cover.fill },
        style,
      ]}
    >
      {coverUri ? (
        <Image
          source={{ uri: coverUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          onLoad={(e) => {
            const { width: w, height: h } = e.nativeEvent.source;
            if (w > 0 && h > 0) setNaturalAspect(w / h);
          }}
          // File was deleted out from under us, or extraction wrote a
          // path that's no longer readable. Ask the hook to re-check
          // disk + re-extract. If extraction fails (no book file, no
          // embedded cover), the hook returns null and the glyph
          // renders.
          onError={() => {
            setNaturalAspect(null);
            retry();
          }}
        />
      ) : (
        <Text
          style={[styles.glyph, { fontSize: (width ?? 64) * 0.6, color: cover.ink }]}
          numberOfLines={1}
        >
          {glyph}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 8,
  },
  glyph: {
    // Colour comes from the call site — it is the `ink` half of the chosen
    // cover pair, not a palette token, because it has to contrast with the
    // fill underneath rather than with the page.
    fontFamily: fontFamily.jp,
    lineHeight: undefined,
  },
});
