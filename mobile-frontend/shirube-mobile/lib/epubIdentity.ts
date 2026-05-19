// EPUB identity probe — mobile mirror of web's lib/epubIdentity.ts.
//
// Computes:
//   - fileHash    SHA-256 of raw .epub bytes
//   - contentHash SHA-256 of concatenated spine text (survives repack noise)
//   - dcIdentifier, language, publisher  from content.opf
//   - title, creator                     from content.opf
//
// Pure JS: JSZip for unzip, regex-based OPF parsing (no DOMParser on RN),
// js-sha256 for hashing. One-shot at import time only.

import { File } from 'expo-file-system';
import JSZip from 'jszip';
import { sha256 } from 'js-sha256';
import { bookFilePath } from './bookFiles';

export interface EpubIdentity {
  fileHash: string;
  contentHash: string;
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
}

export interface EpubProbe extends EpubIdentity {
  title: string | null;
  creator: string | null;
}

/**
 * Probe a stored EPUB for hashes + OPF metadata. Returns null on any
 * unrecoverable failure (file missing, not a zip, no OPF) — callers should
 * treat that as "fall through to filename-only matching".
 */
export async function probeEpubFile(filename: string): Promise<EpubProbe | null> {
  if (!filename.toLowerCase().endsWith('.epub')) return null;
  try {
    const file = new File(bookFilePath(filename));
    if (!file.exists) return null;
    const bytes = await file.bytes();
    const fileHash = sha256(bytes);

    const zip = await JSZip.loadAsync(bytes);
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) return makeEmpty(fileHash);

    const containerXml = await containerFile.async('string');
    const opfPath = parseRootfilePath(containerXml);
    if (!opfPath) return makeEmpty(fileHash);

    const opfFile = zip.file(opfPath);
    if (!opfFile) return makeEmpty(fileHash);
    const opfXml = await opfFile.async('string');
    const opf = parseOpf(opfXml);

    // Resolve spine hrefs relative to the OPF's directory and concatenate
    // their stripped text. The resulting hash survives repacks that change
    // file ordering / compression but not the actual readable content.
    const opfDir = opfPath.includes('/')
      ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
      : '';
    let spineText = '';
    for (const href of opf.spineHrefs) {
      const fullPath = opfDir + decodeURIComponent(href);
      const xhtml = await zip.file(fullPath)?.async('text');
      if (xhtml) spineText += stripHtml(xhtml);
    }
    const contentHash = spineText.length > 0 ? sha256(spineText) : fileHash;

    return {
      fileHash,
      contentHash,
      dcIdentifier: opf.dcIdentifier,
      language: opf.language,
      publisher: opf.publisher,
      title: opf.title,
      creator: opf.creator,
    };
  } catch {
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEmpty(fileHash: string): EpubProbe {
  return {
    fileHash,
    contentHash: fileHash,
    dcIdentifier: null,
    language: null,
    publisher: null,
    title: null,
    creator: null,
  };
}

function parseRootfilePath(containerXml: string): string | null {
  const m = /<rootfile[^>]+full-path=["']([^"']+)["']/i.exec(containerXml);
  return m ? m[1]! : null;
}

type OpfData = {
  spineHrefs: string[];
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
  title: string | null;
  creator: string | null;
};

function parseOpf(xml: string): OpfData {
  // Regex-based parsing — no DOMParser on RN. Good enough for well-formed
  // OPFs, which is the vast majority of EPUBs in the wild.
  const dcTag = (tag: string): string | null => {
    const re = new RegExp(`<(?:dc:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:dc:)?${tag}>`, 'i');
    const m = re.exec(xml);
    return m ? decodeXmlEntities(m[1]!).trim() || null : null;
  };

  const dcIdentifier = dcTag('identifier');
  const language = dcTag('language');
  const publisher = dcTag('publisher');
  const title = dcTag('title');
  const creator = dcTag('creator');

  // Build manifest id → href map
  const idToHref = new Map<string, string>();
  const manifestRe = /<item\b([^>]+)\/?>/gi;
  let mm: RegExpExecArray | null;
  while ((mm = manifestRe.exec(xml)) !== null) {
    const attrs = mm[1]!;
    const idMatch = /\bid=["']([^"']+)["']/.exec(attrs);
    const hrefMatch = /\bhref=["']([^"']+)["']/.exec(attrs);
    if (idMatch && hrefMatch) idToHref.set(idMatch[1]!, hrefMatch[1]!);
  }

  // Walk <spine>'s itemrefs in document order
  const spineMatch = /<spine\b[^>]*>([\s\S]*?)<\/spine>/i.exec(xml);
  const spineHrefs: string[] = [];
  if (spineMatch) {
    const itemRefRe = /<itemref\b[^>]*\bidref=["']([^"']+)["']/gi;
    let im: RegExpExecArray | null;
    while ((im = itemRefRe.exec(spineMatch[1]!)) !== null) {
      const href = idToHref.get(im[1]!);
      if (href) spineHrefs.push(href);
    }
  }

  return { spineHrefs, dcIdentifier, language, publisher, title, creator };
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

function stripHtml(xhtml: string): string {
  return xhtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
