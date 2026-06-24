/**
 * SHA-256 of arbitrary bytes, returned as lowercase hex.
 *
 * Uses the Web Crypto API. Accepts both ArrayBuffer and Uint8Array so
 * callers don't need to think about which one their input is.
 */
export async function sha256Hex(
  data: ArrayBuffer | Uint8Array<ArrayBuffer>,
): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256 of a UTF-8-encoded string, returned as lowercase hex.
 * Wrapper over `sha256Hex` for the text-hashing callers (content_hash,
 * page_hashes) so they don't repeat the TextEncoder dance.
 */
export async function sha256HexString(s: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(s));
}
