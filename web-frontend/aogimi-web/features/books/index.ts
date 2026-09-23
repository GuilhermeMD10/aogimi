// Books feature public surface.
// Data layer
export { getUserBooks } from './lib';
export { reconcileBooks } from './lib';
// Local IndexedDB records — the only place cover art exists (blobs never go
// to the backend). Profile reads these to pair covers with backend rows.
export { getAllBooks, wipeBookDatabase } from './lib';
export type { BookRecord } from './lib';
// Views
export { default as BooksView } from './views/BooksView';
export { ReaderView, ReaderModal, AddedToast } from './reader';
