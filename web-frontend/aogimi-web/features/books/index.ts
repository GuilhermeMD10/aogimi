// Books feature public surface.
// Data layer
export { getUserBooks } from './lib/booksApi';
export { reconcileBooks } from './lib/reconcileBooks';
export { wipeBookDatabase } from './lib/bookStore';
export type { BookRecord } from './lib/bookStore';
// Views
export { default as BooksView } from './views/BooksView';
export { ReaderView, ReaderBubble } from './reader';
