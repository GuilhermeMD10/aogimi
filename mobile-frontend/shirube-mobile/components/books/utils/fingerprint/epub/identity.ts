// EPUB identity probe — mobile mirror of web's fingerprint/epub/identity.ts.
//
// Computes:
//   - fileHash    SHA-256 of raw .epub bytes
//   - contentHash SHA-256 of concatenated spine text (survives repack noise)
//   - dcIdentifier, language, publisher  from content.opf
//   - title, creator                     from content.opf

import { File } from 'expo-file-system';
import JSZip from 'jszip';
import { bookFilePath } from '../../bookPaths';
import { sha256Hex } from '../hash';
import { FINGERPRINT_VERSION } from '../version';
import { parseOpf, parseRootfilePath, stripHtml } from './opf';

export interface EpubIdentity {
  fileHash: string;
  contentHash: string;
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
  /** Version of the algorithm that produced these fields. Mirrors the
   *  PDF side's `PdfProbe.fingerprintVersion`. */
  fingerprintVersion: number;
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
    const fileHash = await sha256Hex(bytes);

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
    const contentHash = spineText.length > 0
      ? await sha256Hex(new TextEncoder().encode(spineText))
      : fileHash;

    return {
      fileHash,
      contentHash,
      dcIdentifier: opf.dcIdentifier,
      language: opf.language,
      publisher: opf.publisher,
      title: opf.title,
      creator: opf.creator,
      fingerprintVersion: FINGERPRINT_VERSION,
    };
  } catch {
    return null;
  }
}

function makeEmpty(fileHash: string): EpubProbe {
  return {
    fileHash,
    contentHash: fileHash,
    dcIdentifier: null,
    language: null,
    publisher: null,
    title: null,
    creator: null,
    fingerprintVersion: FINGERPRINT_VERSION,
  };
}
