// Reader sub-feature public surface.
export { default as ReaderView } from './views/ReaderView';
export { EpubReader } from './components/EpubReader';
export { PdfReader } from './components/PdfReader';
export { default as ReaderBubble } from './reader-bubble';
// The docked lookup column. Composed by `ReaderView`, so it isn't re-exported
// through the books barrel — nothing outside the reader mounts it.
export { default as DictSidebar } from './dict-sidebar';
