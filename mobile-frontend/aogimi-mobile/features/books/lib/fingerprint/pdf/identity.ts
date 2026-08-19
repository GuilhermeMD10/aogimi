import { File } from 'expo-file-system';
import { bookFilePath } from '../../bookPaths';
import { sha256Hex } from '../hash';
import { FINGERPRINT_VERSION } from '../version';
import {
  bytesToLatin1,
  extractIds,
  extractProducer,
  extractTitle,
} from './trailerScan';
import { extractXmpIds } from './xmp';

export type PdfProbe = {
  /** Title from /Info /Title, decoded. Null when absent or unparseable. */
  title: string | null;
  /** SHA-256 of the raw PDF bytes. Same field name the backend matcher uses. */
  fileHash: string | null;
  /** PDF /ID[0] — stable across modifications. Strong cross-device match key. */
  pdfIdOriginal: string | null;
  /** PDF /ID[1] — changes on each save. Stored for forensics. */
  pdfIdCurrent: string | null;
  /** Total page count. Null on mobile: with no native PDF parser the
   *  tail-only scan can't reliably resolve the page tree. */
  pageCount: number | null;
  /** True when the PDF has an extractable text layer. Null on mobile: no
   *  text-extraction capability without a PDF library. */
  hasTextLayer: boolean | null;
  /** /Producer from /Info. Diagnostic only — not used in matching. */
  producer: string | null;
  /** xmpMM:DocumentID — changes on export/save-as. Stored for forensics. */
  xmpDocumentId: string | null;
  /** xmpMM:OriginalDocumentID — stable across re-saves of the same source
   *  document. Strong cross-device match key. */
  xmpOriginalId: string | null;
  /** Version of the algorithm that produced these fields. */
  fingerprintVersion: number;
};

// Most PDFs have the trailer + xref + metadata stream within the last
// 16-128 KB even for large files. 128 KB covers virtually every
// well-formed PDF in the wild, including embedded XMP packets.
const TAIL_BYTES = 128 * 1024;

/**
 * Probe a stored PDF for title + fingerprint. Best-effort: any failure
 * yields nulls, never throws.
 *
 * Mobile can't render or parse the PDF object graph — it's a regex scan
 * over the last 128 KB of the file. This catches /ID, /Title, /Producer,
 * and the embedded XMP packet for the overwhelming majority of PDFs (the
 * metadata stream and trailer are conventionally placed near the end).
 * Linearized PDFs that put metadata near the start may slip through with
 * partial fingerprints — an accepted limit of the tail-only scan.
 */
export async function probePdfFile(filename: string): Promise<PdfProbe> {
  const empty: PdfProbe = {
    title: null,
    fileHash: null,
    pdfIdOriginal: null,
    pdfIdCurrent: null,
    pageCount: null,
    hasTextLayer: null,
    producer: null,
    xmpDocumentId: null,
    xmpOriginalId: null,
    fingerprintVersion: FINGERPRINT_VERSION,
  };
  try {
    const file = new File(bookFilePath(filename));
    if (!file.exists) return empty;

    // Read the whole file once: native sha256 of the bytes is the
    // `fileHash`, and the trailing chunk is what carries the trailer
    // /Info + /ID + XMP packet.
    const buf = await file.bytes();
    const fileHash = await sha256Hex(buf);
    const start = Math.max(0, buf.length - TAIL_BYTES);
    const tail = buf.subarray(start);
    const tailStr = bytesToLatin1(tail);
    const ids = extractIds(tailStr);
    const xmpIds = extractXmpIds(tailStr);

    return {
      title: extractTitle(tailStr),
      fileHash,
      pdfIdOriginal: ids.original,
      pdfIdCurrent: ids.current,
      pageCount: null,
      hasTextLayer: null,
      producer: extractProducer(tailStr),
      xmpDocumentId: xmpIds.documentId,
      xmpOriginalId: xmpIds.originalDocumentId,
      fingerprintVersion: FINGERPRINT_VERSION,
    };
  } catch {
    return empty;
  }
}
