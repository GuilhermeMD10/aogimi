// Single-value defaults for the native selection appearance. Theme hookup
// (per ReaderThemeStyle or app theme) is a follow-up — keeping the values
// here lets future themes override by reading from this module.

export const SELECTION_BAND_COLOR = '#C0EDEB';

// More accented than the band — used by the Android handle drawables (vector
// line) and as the iOS tint. Mirrored in `android/app/src/main/res/values/
// colors.xml` as `text_select_accent`; keep the two in sync.
export const POINTER_ACCENT_COLOR = '#3A3A3A';
