# Aogimi — Brand Assets

The app icon — an ema plaque with a bow, rising out of a seigaiha wave band,
under the app's own night sky — and the lowercase wordmark.

Everything under `app-icon/` and `favicon/` is **generated**. Do not hand-edit
it. The geometry lives in `build-icons.mjs`, and one command rewrites every
launcher and favicon asset across both frontends:

    node aogimi-brand-assets/build-icons.mjs

## The ground is the app's sky

The icon is not on a flat colour. It sits on the same Midnight gradient the app
paints as `--page-base` — vertical ramp through `--sky-1/2/3` with a violet glow
over it. Those stops, plus the vermilion and gold, are duplicated into
`build-icons.mjs` from:

  - `web-frontend/aogimi-web/styles/ds-tokens.css` — the sky stops and glow
  - `web-frontend/aogimi-web/features/sky/stage/lib/nightChrome.ts` — `NIGHT.accent`
    ("the logo tile's vermilion") and `NIGHT.gold`

The script cannot read CSS, so that duplication is the one place the icon can
drift from the app. If the palette moves there, mirror it here.

## Framings

Four, because one file cannot satisfy every platform's cropping rule.

  rounded     Sky + card, clipped to a rounded tile (iOS-style 22.37% radius).
              The general-purpose icon: `icon.png`, PWA 192/512, Android legacy
              launcher, the README mark.

  square      Same art, full-bleed square, no alpha. For slots that mask for
              themselves or forbid transparency: the App Store 1024, the iOS
              home-screen/apple-touch 180, the Windows tile.

  contained   Card pulled inside the middle 66%. Required by Android adaptive
              and PWA `maskable`, both of which crop the edges — the bleeding
              form would lose its bottom corners to the mask.

  star        Sky + the gold star alone, no card. Below ~64px the card, bow,
              eyes and keyline all collapse into mush, so the star carries the
              identity. This is the whole favicon set.

## File index

  app-icon/
    app-icon.svg              rounded tile — canonical
    app-icon-square.svg       square, full-bleed
    app-icon-contained.svg    edge-safe, on sky
    app-icon-foreground.svg   edge-safe, transparent (Android adaptive layer)
    app-icon-background.svg   sky gradient alone (Android adaptive layer)
    favicon.svg               sky + gold star
    icon-1024.png             rounded
    icon-512.png              rounded
    icon-256.png              rounded — README mark
    icon-192.png              rounded — Android
    icon-180.png              square — iOS home screen
    icon-1024-square.png      square, no alpha — App Store
    icon-1024-contained.png   edge-safe

  favicon/
    favicon-{16,32,64}.png    star only

  wordmark/
    aogimi-wordmark.svg          text-based (needs Source Serif 4 installed)
    aogimi-wordmark-paper.svg    paper colour, for dark grounds
    aogimi-wordmark-{520x120,1040x240,2080x480}.png

The wordmark PNGs ship as ink-on-transparent, which is invisible against the
sky. `build-icons.mjs` recolours them to `NIGHT.ink` for the open-graph lockup
by keeping the alpha and replacing the colour channels — no font install needed.

## Provenance

The geometry in `build-icons.mjs` is a **vector reconstruction**, traced by eye
from raster previews — the original design files were never added to the repo.
It matches the previews closely but is not guaranteed identical to them, and the
previews arrived without their intended background, which is why the first pass
was built on flat white by mistake.

If the originals turn up, prefer them: drop the artwork in over the four SVG
sources and delete the geometry section of `build-icons.mjs`, keeping its target
table. Every downstream asset is then one build away from correct.

## Note on the native mobile trees

`mobile-frontend/aogimi-mobile/ios/` and `android/` are gitignored `expo
prebuild` output. `build-icons.mjs` refreshes them in place when they exist, so
a local build picks up a new icon without a full prebuild — but it will never
create them. After a fresh prebuild the native icons are regenerated from
`assets/icon.png`, `assets/adaptive-icon.png` and
`assets/adaptive-icon-background.png`, which this script also writes, so either
path ends up correct.
