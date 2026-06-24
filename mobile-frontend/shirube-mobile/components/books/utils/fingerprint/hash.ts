import * as Crypto from 'expo-crypto';

/**
 * SHA-256 of arbitrary bytes, returned as lowercase hex.
 *
 * Uses expo-crypto's native digest (~50-100× faster than pure-JS js-sha256
 * on large files — multi-second stalls on 50 MB+ PDFs/EPUBs).
 */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  // expo-crypto's BufferSource overload wants ArrayBufferView<ArrayBuffer>,
  // but TS 5.x narrows Uint8Array<ArrayBufferLike>; cast is a no-op at runtime.
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data as unknown as BufferSource,
  );
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i]!.toString(16).padStart(2, '0');
  }
  return s;
}
