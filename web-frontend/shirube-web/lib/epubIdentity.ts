import JSZip from 'jszip';

// ── Types ────────────────────────────────────────────────────────────────────

export interface EpubIdentity {
  fileHash: string;
  contentHash: string;
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
}

export interface EpubData extends EpubIdentity {
  title: string;
  creator: string;
  /** Base64 data URL (e.g. `data:image/jpeg;base64,…`) or undefined if not found. */
  coverImage?: string;
}

const DC_NS = 'http://purl.org/dc/elements/1.1/';

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse an EPUB file directly (jszip + DOMParser) and extract everything we need:
 *
 * - Identity hashes: fileHash (raw bytes), contentHash (concatenated spine text)
 * - OPF metadata:    dc:identifier, dc:language, dc:publisher, dc:title, dc:creator
 * - Cover image:     extracted from the manifest (EPUB 3 properties or EPUB 2 meta)
 *
 * Set `extractCover: false` to skip cover extraction when only identity is needed.
 */
export async function extractEpubData(
  arrayBuffer: ArrayBuffer,
  options: { extractCover?: boolean } = {},
): Promise<EpubData> {
  const extractCover = options.extractCover !== false;

  // 1. File hash — SHA-256 of raw bytes
  const fileHash = await sha256Hex(arrayBuffer);

  // 2. Parse the EPUB ZIP
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 3. Read container.xml → OPF path
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) return emptyData(fileHash);

  const opfPath = parseContainerXml(containerXml);
  if (!opfPath) return emptyData(fileHash);

  // 4. Read and parse OPF
  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) return emptyData(fileHash);

  const opf = parseOpf(opfXml);

  // 5. Resolve paths relative to the OPF's directory
  const opfDir = opfPath.includes('/')
    ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
    : '';

  // 6. Concatenate spine text and hash
  let spineText = '';
  for (const href of opf.spineHrefs) {
    const fullPath = opfDir + decodeURIComponent(href);
    const xhtml = await zip.file(fullPath)?.async('text');
    if (xhtml) spineText += stripHtml(xhtml);
  }
  const contentHash = spineText.length > 0
    ? await sha256Hex(new TextEncoder().encode(spineText))
    : fileHash;

  // 7. Cover image (best-effort)
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
  };
}

/**
 * Identity-only convenience wrapper — skips cover extraction and returns the
 * narrow {@link EpubIdentity} shape used by API contracts.
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
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  };
}

async function sha256Hex(data: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function parseContainerXml(xml: string): string | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const rootfile = doc.querySelector('rootfile');
  return rootfile?.getAttribute('full-path') ?? null;
}

interface ManifestItem {
  href: string;
  mediaType: string;
}

interface OpfData {
  spineHrefs: string[];
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
  title: string | null;
  creator: string | null;
  coverItem: ManifestItem | null;
}

function parseOpf(xml: string): OpfData {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  // dc:* metadata — try non-namespaced selector first, fall back to DC namespace
  const dcText = (tag: string): string | null =>
    doc.querySelector(`metadata ${tag}`)?.textContent?.trim() ??
    doc.getElementsByTagNameNS(DC_NS, tag)[0]?.textContent?.trim() ??
    null;

  const dcIdentifier = dcText('identifier');
  const language = dcText('language');
  const publisher = dcText('publisher');
  const title = dcText('title');
  const creator = dcText('creator');

  // Build manifest id → item map
  const manifestEls = doc.querySelectorAll('manifest > item');
  const idToItem = new Map<string, ManifestItem & { id: string; properties: string }>();
  manifestEls.forEach((el) => {
    const id = el.getAttribute('id');
    const href = el.getAttribute('href');
    const mediaType = el.getAttribute('media-type') ?? '';
    const properties = el.getAttribute('properties') ?? '';
    if (id && href) idToItem.set(id, { id, href, mediaType, properties });
  });

  // Cover detection — EPUB 3 first, then EPUB 2 fallback
  let coverItem: ManifestItem | null = null;
  for (const item of idToItem.values()) {
    if (item.properties.split(/\s+/).includes('cover-image')) {
      coverItem = { href: item.href, mediaType: item.mediaType };
      break;
    }
  }
  if (!coverItem) {
    const coverMeta = doc.querySelector('metadata > meta[name="cover"]');
    const coverId = coverMeta?.getAttribute('content');
    const item = coverId ? idToItem.get(coverId) : undefined;
    if (item) coverItem = { href: item.href, mediaType: item.mediaType };
  }

  // Spine itemrefs in order
  const spineRefs = doc.querySelectorAll('spine > itemref');
  const spineHrefs: string[] = [];
  spineRefs.forEach((ref) => {
    const idref = ref.getAttribute('idref');
    if (idref) {
      const item = idToItem.get(idref);
      if (item) spineHrefs.push(item.href);
    }
  });

  return {
    spineHrefs,
    dcIdentifier,
    language,
    publisher,
    title,
    creator,
    coverItem,
  };
}

async function readCover(
  zip: JSZip,
  opfDir: string,
  cover: ManifestItem,
): Promise<string | undefined> {
  const coverPath = opfDir + decodeURIComponent(cover.href);
  const base64 = await zip.file(coverPath)?.async('base64');
  if (!base64) return undefined;
  const mediaType = cover.mediaType || 'image/jpeg';
  return `data:${mediaType};base64,${base64}`;
}

function stripHtml(xhtml: string): string {
  try {
    const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
    return doc.body?.textContent ?? '';
  } catch {
    return xhtml.replace(/<[^>]*>/g, '');
  }
}
