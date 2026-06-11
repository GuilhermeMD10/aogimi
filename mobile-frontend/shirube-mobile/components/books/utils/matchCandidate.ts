// Single source for the `MatchCandidate` shape used to call the
// backend's `matchBooks` endpoint. Two callers feed it different
// in-memory representations:
//
//   - bookPush.pushOneBook → from a `PendingPayload` snapshot stored
//     on disk
//   - locateBookFile        → from a freshly imported `ImportedBook`
//
// Both used to construct the candidate inline with identical field
// orders, so any tweak (e.g. add a new identity field) required
// touching both sites. The shared `buildMatchCandidate` keeps the
// match-priority order owned in one place.
//
// The narrow `BookIdentityFields` input matches the intersection of
// `PendingPayload` and `ImportedBook` — both expose every field below
// with the same name and nullability.

export type BookIdentityFields = {
  filename: string;
  title: string;
  author: string;
  fileHash: string | null;
  contentHash: string | null;
  pdfIdOriginal: string | null;
  xmpOriginalId: string | null;
  detectedDoi: string | null;
  detectedIsbn: string | null;
  pageCount: number | null;
  pagePhashes: string[] | null;
  dcIdentifier: string | null;
};

export function buildMatchCandidate(input: BookIdentityFields) {
  return {
    file_hash: input.fileHash,
    content_hash: input.contentHash,
    pdf_id_original: input.pdfIdOriginal,
    xmp_original_id: input.xmpOriginalId,
    detected_doi: input.detectedDoi,
    detected_isbn: input.detectedIsbn,
    page_count: input.pageCount,
    page_phashes: input.pagePhashes,
    metadata: {
      title: input.title || input.filename,
      author: input.author,
      dc_identifier: input.dcIdentifier,
      filename: input.filename,
    },
  };
}
