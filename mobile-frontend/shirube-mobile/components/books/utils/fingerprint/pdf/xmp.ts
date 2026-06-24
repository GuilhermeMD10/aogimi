/**
 * Extract `xmpMM:DocumentID` and `xmpMM:OriginalDocumentID` from a raw
 * XMP packet (or any string containing XMP-like XML).
 *
 * Handles both serializations RDF/XMP allows:
 *
 *   1. Element form:
 *      `<xmpMM:DocumentID>uuid:abc</xmpMM:DocumentID>`
 *
 *   2. Attribute-on-rdf:Description form:
 *      `<rdf:Description xmpMM:DocumentID="uuid:abc" ...>`
 *
 * We only match the canonical `xmpMM:` prefix. Strictly correct namespace
 * resolution would require parsing the document's xmlns declarations,
 * but no PDF in the wild rebinds the Adobe Media Management namespace.
 *
 * This module is byte-identical on web and mobile — both platforms share
 * it so fingerprints match across devices. Don't add platform-specific
 * code here.
 */
export function extractXmpIds(xmp: string): {
  documentId: string | null;
  originalDocumentId: string | null;
} {
  return {
    documentId: extractField(xmp, 'DocumentID'),
    originalDocumentId: extractField(xmp, 'OriginalDocumentID'),
  };
}

function extractField(s: string, name: string): string | null {
  // Element form: <xmpMM:DocumentID>value</xmpMM:DocumentID>
  const elem = new RegExp(
    `<xmpMM:${name}\\b[^>]*>([^<]+)</xmpMM:${name}>`,
    'i',
  );
  const elemMatch = elem.exec(s);
  if (elemMatch) {
    const trimmed = elemMatch[1]!.trim();
    if (trimmed) return trimmed;
  }
  // Attribute form: xmpMM:DocumentID="value" (also accepts single quotes)
  const attr = new RegExp(
    `xmpMM:${name}\\s*=\\s*["']([^"']+)["']`,
    'i',
  );
  const attrMatch = attr.exec(s);
  if (attrMatch) {
    const trimmed = attrMatch[1]!.trim();
    if (trimmed) return trimmed;
  }
  return null;
}
