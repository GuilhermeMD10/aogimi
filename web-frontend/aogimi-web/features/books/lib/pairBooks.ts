// The one rule for "this local book and that backend row are the same book".
//
// Every surface that has to line up local IndexedDB rows against
// `book_progress` rows asks here: the library merge (`useSyncBooks`), the
// push of local-only books (`bookStore.syncLocalBooksToBackend`), the
// reconcile pass (`reconcileBooks`), and the reader resolving which row to
// restore from and flush to (`ReaderView`).
//
// **Content first, filename second.** `file_hash` is the identity; the
// filename is presentation. The same file imported on a second device under
// a different name is the same book, and pairing it by name instead splits
// it in two: the reader finds no row, registers a fresh one at progress 0,
// and the user's real position is orphaned on the row they can no longer
// reach.
//
// The filename fallback still matters, so it stays:
//
//   - Rows registered before fingerprinting existed carry no `file_hash`.
//   - It is what lets `reconcileBooks` still detect stale local bytes —
//     no hash twin plus a filename twin whose hash differs means another
//     device replaced the content under that name.
//
// Deliberately structural, not tied to `BookRecord` / `BookProgressRecord`:
// `bookStore` imports this module, so this module must not import back.

/** The local IndexedDB side — the fields of a `BookRecord` used to pair. */
export type LocalBookIdentity = {
  filename: string;
  fileHash?: string | null;
};

/** The backend side — the fields of a `BookProgressRecord` used to pair. */
export type RemoteBookIdentity = {
  filename: string;
  file_hash: string | null;
};

type Identity = { filename: string; hash: string | null };

const ofLocal = (b: LocalBookIdentity): Identity => ({
  filename: b.filename,
  hash: b.fileHash ?? null,
});

const ofRemote = (b: RemoteBookIdentity): Identity => ({
  filename: b.filename,
  hash: b.file_hash ?? null,
});

function findTwin<T>(
  self: Identity,
  others: T[],
  identityOf: (other: T) => Identity,
): T | undefined {
  if (self.hash) {
    const byHash = others.find((other) => identityOf(other).hash === self.hash);
    if (byHash) return byHash;
  }
  return others.find((other) => identityOf(other).filename === self.filename);
}

/** The backend row for a local book: same bytes, else same filename slot. */
export function findRemoteTwin<R extends RemoteBookIdentity>(
  local: LocalBookIdentity,
  remotes: R[],
): R | undefined {
  return findTwin<R>(ofLocal(local), remotes, ofRemote);
}

/** The local book for a backend row — the mirror of `findRemoteTwin`. */
export function findLocalTwin<L extends LocalBookIdentity>(
  remote: RemoteBookIdentity,
  locals: L[],
): L | undefined {
  return findTwin<L>(ofRemote(remote), locals, ofLocal);
}
