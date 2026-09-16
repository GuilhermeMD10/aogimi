// Text selection inside the reader's WebView: the gesture that draws the band,
// and the appearance constants that go with it.
//
// **The menu is no longer here.** `NativeSelectionMenu` and `menuPosition`
// placed a three-icon popover over the selection, flipping above or below it and
// clamping to the viewport. The redesigned `ReaderDock` carries those three
// actions as its word-selected state — bottom-centre, where the thumb already
// is — so there is nothing left to position, and both files went with the menu.
// The detection is untouched: the WebView still owns the band and still reports
// `selection` over the bridge with its text, its sentence and its rect.

export { POINTER_ACCENT_COLOR } from './constants';
export { TAP_TO_SELECT_FN } from './webviewInjections';
