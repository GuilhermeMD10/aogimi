// Books feature public surface. (Reader exports are added in step 6b.)
export { getUserBooks } from './lib/booksApi';
export { reconcileBooks } from './lib/reconcileBooks';
export { wipeBookDatabase } from './lib/bookStore';
export type { BookRecord } from './lib/bookStore';
