export type OpfData = {
  spineHrefs: string[];
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
  title: string | null;
  creator: string | null;
};

export function parseRootfilePath(containerXml: string): string | null {
  const m = /<rootfile[^>]+full-path=["']([^"']+)["']/i.exec(containerXml);
  return m ? m[1]! : null;
}

export function parseOpf(xml: string): OpfData {
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

export function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

export function stripHtml(xhtml: string): string {
  return xhtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
