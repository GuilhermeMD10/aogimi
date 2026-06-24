// Takes a hex or rgb/rgba color and returns the same hue with a new alpha.
// Hex accepts #rgb / #rrggbb / #rrggbbaa. rgb()/rgba() values are preserved
// with the channel overridden.

export function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const trimmed = color.trim();

  if (trimmed.startsWith('#')) {
    const { r, g, b } = parseHex(trimmed);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${a})`;
  }

  return trimmed;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
