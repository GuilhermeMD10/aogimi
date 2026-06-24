/**
 * Perceptual hash (dHash) for visual page matching.
 *
 * Adapter contract: the platform side hands us a deterministic **64x64
 * grayscale buffer** (one byte per pixel, row-major, 8-bit luminance).
 * Everything from here is pure TypeScript so web and a future mobile
 * native-renderer adapter produce bit-identical hashes for the same input.
 *
 * Algorithm (dHash):
 *   1. Area-average the 64x64 input down to 9x8.
 *   2. For each row, compare each pixel to its right neighbor:
 *      bit = 1 if left > right, else 0.
 *   3. 8 rows × 8 bits = 64 bits → 16-char hex string.
 *
 * dHash is chosen over pHash/aHash because:
 *   - It's deterministic with no FFT/cosine-transform numerical drift.
 *   - It's robust to brightness shifts and small re-renders.
 *   - It's cheap enough to run inline on import.
 *
 * The 64x64 → 9x8 downsample lives here (not in the platform adapter)
 * so the lossy step that affects the hash is under our control.
 */

/**
 * Pick which pages to render for perceptual hashing. Deterministic — both
 * sides of a future cross-platform compare must call this with the same
 * pageCount and get the same indices, otherwise phashes don't line up.
 *
 * Sampling targets the spec's 5-10 page budget: rendering every page
 * would be the dominant cost of import on big books.
 */
export function samplePageIndices(pageCount: number): number[] {
  if (pageCount <= 0) return [];
  if (pageCount === 1) return [0];
  if (pageCount === 2) return [0, 1];
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }
  if (pageCount <= 30) {
    // First, middle, last — enough variety for short docs without
    // sampling every page.
    return [0, Math.floor(pageCount / 2), pageCount - 1];
  }
  // 30+ pages: 6 samples evenly spaced across the document.
  // For a 300-page book this is [0, 60, 120, 180, 239, 299].
  const n = 6;
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    indices.push(Math.floor((i * (pageCount - 1)) / (n - 1)));
  }
  return indices;
}

/**
 * Compute the dHash of a 64x64 grayscale buffer. Returns a 16-char hex
 * string (64 bits). Throws on wrong buffer size — callers should validate
 * input shape rather than silently producing garbage hashes.
 */
export function dHash(pixels64x64: Uint8Array): string {
  if (pixels64x64.length !== 64 * 64) {
    throw new Error(
      `dHash expects a 64x64 grayscale buffer (4096 bytes), got ${pixels64x64.length}`,
    );
  }

  // Area-average to 9x8. Output pixel (ox, oy) averages a sub-rectangle
  // of the 64x64 input — the rect bounds are computed by partitioning
  // [0, 64) into 9 columns and 8 rows of (mostly) equal width/height.
  const small = new Uint8Array(9 * 8);
  for (let oy = 0; oy < 8; oy++) {
    const y0 = Math.floor((oy * 64) / 8);
    const y1 = Math.floor(((oy + 1) * 64) / 8);
    for (let ox = 0; ox < 9; ox++) {
      const x0 = Math.floor((ox * 64) / 9);
      const x1 = Math.floor(((ox + 1) * 64) / 9);
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += pixels64x64[y * 64 + x]!;
          count++;
        }
      }
      small[oy * 9 + ox] = count > 0 ? Math.round(sum / count) : 0;
    }
  }

  // 64 bits: for each of 8 rows, compare 9 pixels pairwise → 8 bits.
  // Pack high-bit-first into 8 bytes → 16 hex chars.
  let hex = '';
  for (let y = 0; y < 8; y++) {
    let byte = 0;
    for (let x = 0; x < 8; x++) {
      const left = small[y * 9 + x]!;
      const right = small[y * 9 + x + 1]!;
      byte = (byte << 1) | (left > right ? 1 : 0);
    }
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Hamming distance over two same-length hex-encoded hashes. Returns
 * `Number.MAX_SAFE_INTEGER` for mismatched lengths or non-hex input so
 * the value can be used directly in a "min distance ≤ threshold" check
 * without separate validation.
 *
 * Not used in web frontend code — included here for parity testing and
 * potential future client-side scoring.
 */
export function hammingDistanceHex(hexA: string, hexB: string): number {
  if (hexA.length !== hexB.length) return Number.MAX_SAFE_INTEGER;
  let dist = 0;
  for (let i = 0; i < hexA.length; i += 2) {
    const a = parseInt(hexA.slice(i, i + 2), 16);
    const b = parseInt(hexB.slice(i, i + 2), 16);
    if (Number.isNaN(a) || Number.isNaN(b)) return Number.MAX_SAFE_INTEGER;
    let xor = a ^ b;
    while (xor) {
      dist += xor & 1;
      xor >>>= 1;
    }
  }
  return dist;
}
