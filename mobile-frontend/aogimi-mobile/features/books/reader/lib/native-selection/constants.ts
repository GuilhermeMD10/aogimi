// Single-value defaults for the native selection appearance.
//
// The selection band itself is **not** here any more: it is a user setting
// (Profile > Settings > Highlight colour), so its five values live beside the
// other reader palettes in `readerStorage.ts` as `HIGHLIGHT_COLORS`, and the
// chosen one reaches the WebView on `ReaderThemeStyle.highlight`. A constant
// here could not be changed without a rebuild.

// More accented than the band — used by the Android handle drawables (vector
// line) and as the iOS tint. Mirrored in `android/app/src/main/res/values/
// colors.xml` as `text_select_accent`; keep the two in sync.
export const POINTER_ACCENT_COLOR = '#3A3A3A';
