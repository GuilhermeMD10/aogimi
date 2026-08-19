// How a PDF reading position is stored — `page-N` in the CFI slot.
//
// **This encoding is not ours to change.** The mobile reader already writes it
// (`components/reader/ui/pdf/PdfReaderShell.tsx`), so a PDF read on the phone
// and one read here are the same row: `cfi_position = 'page-N'`,
// `spine_index = N` (1-based page, where an EPUB puts a 0-based spine index),
// `total_spine_items = page count`. Matching it is what makes cross-device
// resume work, and it is why PDF position needs no new column.

/** The stored form of a page number. */
export function pdfPageCfi(page: number): string {
  return `page-${page}`;
}

/** Read a page number back out of a stored position. Null for anything that
 *  isn't this encoding — an EPUB CFI, a manga book's empty string, a value
 *  from some future format. */
export function parsePdfPageCfi(cfi: string | null | undefined): number | null {
  if (!cfi) return null;
  const match = /^page-(\d+)$/.exec(cfi);
  if (!match) return null;
  const page = Number.parseInt(match[1]!, 10);
  return Number.isFinite(page) && page > 0 ? page : null;
}
