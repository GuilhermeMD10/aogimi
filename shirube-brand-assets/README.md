# Shirube — Brand Assets

The paragraphos mark and lowercase wordmark, ready to import.

## Colors

  Ink      #1A1918     — primary, used for the mark and wordmark
  Paper    #FFFEFB    — background
  Indigo   #1E3D6B    — paragraphos place-dot (optional accent)

## Type

  Wordmark: Source Serif 4, weight 400, letter-spacing -0.012em, lowercase
  Get it: https://fonts.google.com/specimen/Source+Serif+4

## File index

  marks/
    paragraphos.svg                — pure mark, ink on transparent
    paragraphos-with-dot.svg       — mark + indigo place-dot
    paragraphos-on-ink.svg         — inverted, paper on ink
    paragraphos-{256,512,1024}.png — rendered PNGs (transparent bg)

  wordmark/
    shirube-wordmark.svg           — text-based SVG (requires Source Serif 4 installed)
    shirube-wordmark-paper.svg     — wordmark in paper colour, for ink backgrounds
    shirube-wordmark-{520x120,1040x240,2080x480}.png

  lockup/
    shirube-lockup.svg             — mark + wordmark, horizontal
    shirube-lockup-with-dot.svg    — same, with indigo dot
    shirube-lockup-{600x120,1200x240,2400x480}.png (+ -dot- variants)

  app-icon/
    app-icon-paper.svg             — paper tile, ink mark (light)
    app-icon-ink.svg               — ink tile, paper mark (dark)
    app-icon-paper-{64..1024}.png  — PNG renders for iOS/Android/web manifests
    app-icon-ink-512.png

  favicon/
    favicon.svg                    — vector, scales to any size
    favicon-{16,32,48,64}.png      — raster fallbacks

## Notes

- The mark SVGs are pure vector geometry — they scale to any size with no quality loss.
- The wordmark SVGs use <text> with Source Serif 4. If you need outlined paths
  (e.g. for clients without the font), open the SVG in Figma or Illustrator and
  "convert text to paths" / "outline strokes".
- App icon corner radius follows Apple's superellipse approximation (≈22.37%).
- For dark mode use app-icon-ink-* and paragraphos-on-ink.svg.

— Generated 2026-05-18
