import type JSZip from 'jszip';

const DC_NS = 'http://purl.org/dc/elements/1.1/';

export interface ManifestItem {
  href: string;
  mediaType: string;
}

export interface OpfData {
  spineHrefs: string[];
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
  title: string | null;
  creator: string | null;
  coverItem: ManifestItem | null;
}

export function parseContainerXml(xml: string): string | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const rootfile = doc.querySelector('rootfile');
  return rootfile?.getAttribute('full-path') ?? null;
}

export function parseOpf(xml: string): OpfData {
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

  // Spine itemrefs in document order
  const spineRefs = doc.querySelectorAll('spine > itemref');
  const spineHrefs: string[] = [];
  spineRefs.forEach((ref) => {
    const idref = ref.getAttribute('idref');
    if (idref) {
      const item = idToItem.get(idref);
      if (item) spineHrefs.push(item.href);
    }
  });

  return { spineHrefs, dcIdentifier, language, publisher, title, creator, coverItem };
}

export function stripHtml(xhtml: string): string {
  try {
    const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
    return doc.body?.textContent ?? '';
  } catch {
    return xhtml.replace(/<[^>]*>/g, '');
  }
}

export async function readCover(
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
