// Books feature public surface.
// Data layer
export { getUserBooks } from './lib/booksApi';
export { reconcileBooks } from './lib/reconcileBooks';
// Local IndexedDB records — the only place cover art exists (blobs never go
// to the backend). Profile reads these to pair covers with backend rows.
export { getAllBooks, wipeBookDatabase } from './lib/bookStore';
export type { BookRecord } from './lib/bookStore';
// Views
export { default as BooksView } from './views/BooksView';
export { ReaderView, ReaderBubble } from './reader';
