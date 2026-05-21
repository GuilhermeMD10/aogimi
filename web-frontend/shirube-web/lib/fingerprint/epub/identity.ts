import JSZip from 'jszip';
import { sha256Hex } from '../hash';
import { FINGERPRINT_VERSION } from '../version';
import { parseContainerXml, parseOpf, readCover, stripHtml } from './opf';

export interface EpubIdentity {
  fileHash: string;
  contentHash: string;
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
  /** Version of the algorithm that produced these fields. Mirrors the
   *  PDF side's `PdfIdentity.fingerprintVersion`. */
  fingerprintVersion: number;
}

export interface EpubData extends EpubIdentity {
  title: string;
  creator: string;
  /** Base64 data URL (e.g. `data:image/jpeg;base64,…`) or undefined if not found. */
  coverImage?: string;
}

/**
 * Parse an EPUB file and extract identity hashes + OPF metadata + cover.
 *
 * Set `extractCover: false` to skip cover extraction when only identity is needed.
 */
export async function extractEpubData(
  arrayBuffer: ArrayBuffer,
  options: { extractCover?: boolean } = {},
): Promise<EpubData> {
  const extractCover = options.extractCover !== false;

  const fileHash = await sha256Hex(arrayBuffer);

  const zip = await JSZip.loadAsync(arrayBuffer);

  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) return emptyData(fileHash);

  const opfPath = parseContainerXml(containerXml);
  if (!opfPath) return emptyData(fileHash);

  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) return emptyData(fileHash);

  const opf = parseOpf(opfXml);

  const opfDir = opfPath.includes('/')
    ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
    : '';

  let spineText = '';
  for (const href of opf.spineHrefs) {
    const fullPath = opfDir + decodeURIComponent(href);
    const xhtml = await zip.file(fullPath)?.async('text');
    if (xhtml) spineText += stripHtml(xhtml);
  }
  const contentHash = spineText.length > 0
    ? await sha256Hex(new TextEncoder().encode(spineText))
    : fileHash;

  let coverImage: string | undefined;
  if (extractCover && opf.coverItem) {
    coverImage = await readCover(zip, opfDir, opf.coverItem);
  }

  return {
    fileHash,
    contentHash,
    dcIdentifier: opf.dcIdentifier,
    language: opf.language,
    publisher: opf.publisher,
    title: opf.title || 'Untitled',
    creator: opf.creator || 'Unknown author',
    coverImage,
    fingerprintVersion: FINGERPRINT_VERSION,
  };
}

/**
 * Identity-only convenience wrapper — skips cover extraction and returns
 * the narrow {@link EpubIdentity} shape used by API contracts.
 */
export async function computeEpubIdentity(
  arrayBuffer: ArrayBuffer,
): Promise<EpubIdentity> {
  const data = await extractEpubData(arrayBuffer, { extractCover: false });
  return {
    fileHash: data.fileHash,
    contentHash: data.contentHash,
    dcIdentifier: data.dcIdentifier,
    language: data.language,
    publisher: data.publisher,
    fingerprintVersion: data.fingerprintVersion,
  };
}

function emptyData(fileHash: string): EpubData {
  return {
    fileHash,
    contentHash: fileHash,
    dcIdentifier: null,
    language: null,
    publisher: null,
    title: 'Untitled',
    creator: 'Unknown author',
    coverImage: undefined,
    fingerprintVersion: FINGERPRINT_VERSION,
  };
}
