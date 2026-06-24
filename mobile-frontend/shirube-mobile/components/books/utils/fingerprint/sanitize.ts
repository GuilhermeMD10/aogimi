/**
 * Strip NUL and other C0 control bytes that Postgres' UTF-8 TEXT columns
 * reject ("invalid byte sequence for encoding utf8 0x00"). PDFs with
 * UTF-16BE titles containing padding bytes, or octal `\000` escapes in
 * literal /Title strings, routinely embed these. Keep tab, LF, CR.
 */
export function stripControl(s: string | null | undefined): string | null {
  if (s == null) return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
  return cleaned || null;
}
