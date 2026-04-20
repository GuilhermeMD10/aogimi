import JSZip from 'jszip';

// ── Types ────────────────────────────────────────────────────────────────────

export interface EpubIdentity {
  fileHash: string;
  contentHash: string;
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute identity hashes and extract OPF metadata from an EPUB file.
 *
 * - fileHash:    SHA-256 of the full EPUB bytes (primary match key)
 * - contentHash: SHA-256 of concatenated spine text (matches re-encoded copies)
 * - OPF fields:  dc:identifier, dc:language, dc:publisher (fallback matching)
 */
export async function computeEpubIdentity(
  arrayBuffer: ArrayBuffer,
): Promise<EpubIdentity> {
  // 1. File hash — SHA-256 of raw bytes
  const fileHash = await sha256Hex(arrayBuffer);

  // 2. Parse the EPUB ZIP
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 3. Read container.xml → OPF path
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) {
    // Malformed EPUB — return file hash only, skip content analysis
    return { fileHash, contentHash: fileHash, dcIdentifier: null, language: null, publisher: null };
  }

  const opfPath = parseContainerXml(containerXml);
  if (!opfPath) {
    return { fileHash, contentHash: fileHash, dcIdentifier: null, language: null, publisher: null };
  }

  // 4. Read and parse OPF
  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) {
    return { fileHash, contentHash: fileHash, dcIdentifier: null, language: null, publisher: null };
  }

  const opf = parseOpf(opfXml);

  // 5. Resolve spine hrefs relative to OPF directory
  const opfDir = opfPath.includes('/')
    ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
    : '';

  // 6. Concatenate spine text and hash
  let spineText = '';
  for (const href of opf.spineHrefs) {
    const fullPath = opfDir + decodeURIComponent(href);
    const xhtml = await zip.file(fullPath)?.async('text');
    if (xhtml) {
      spineText += stripHtml(xhtml);
    }
  }

  const contentHash = spineText.length > 0
    ? await sha256Hex(new TextEncoder().encode(spineText))
    : fileHash; // No readable spine content — fall back to file hash

  return {
    fileHash,
    contentHash,
    dcIdentifier: opf.dcIdentifier,
    language: opf.language,
    publisher: opf.publisher,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

interface OpfData {
  spineHrefs: string[];
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
}

function parseOpf(xml: string): OpfData {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  // Extract dc: metadata — try both namespaced and non-namespaced selectors
  const dcIdentifier =
    doc.querySelector('metadata identifier')?.textContent?.trim() ??
    doc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'identifier')[0]?.textContent?.trim() ??
    null;

  const language =
    doc.querySelector('metadata language')?.textContent?.trim() ??
    doc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'language')[0]?.textContent?.trim() ??
    null;

  const publisher =
    doc.querySelector('metadata publisher')?.textContent?.trim() ??
    doc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'publisher')[0]?.textContent?.trim() ??
    null;

  // Build manifest id → href map
  const manifestItems = doc.querySelectorAll('manifest > item');
  const idToHref = new Map<string, string>();
  manifestItems.forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) idToHref.set(id, href);
  });

  // Read spine itemrefs in order
  const spineRefs = doc.querySelectorAll('spine > itemref');
  const spineHrefs: string[] = [];
  spineRefs.forEach((ref) => {
    const idref = ref.getAttribute('idref');
    if (idref) {
      const href = idToHref.get(idref);
      if (href) spineHrefs.push(href);
    }
  });

  return { spineHrefs, dcIdentifier, language, publisher };
}

function stripHtml(xhtml: string): string {
  // Use DOMParser for accurate text extraction from XHTML
  try {
    const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
    return doc.body?.textContent ?? '';
  } catch {
    // Fallback: strip tags with regex for malformed XHTML
    return xhtml.replace(/<[^>]*>/g, '');
  }
}
