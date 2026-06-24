# Authoring a Theme

This is the **how-to** companion to [THEMES.md](THEMES.md) (which is the reference). Read this when you're sitting down to add a new theme — Sakura-Night, Hanami-Day, whatever — and want a step-by-step.

The goal of this document: tell you what you must do, what you may do, and what you must *not* do. The architecture rewards staying inside the lines and punishes drift.

---

## Core idea

A theme is **three layers** stacked over a single `data-theme="<name>"` attribute on `<html>`:

1. **Color tokens** (`--lgc-bg`, `--lgc-fg`, `--lgc-accent`, …) — every theme must declare these.
2. **Shape tokens** (`--lgc-surface-*`, `--lgc-button-*`, `--lgc-chip-*`, …) — theme overrides only when the visual identity demands it. Inherited from `styles/shape-defaults.css` otherwise.
3. **Whole-screen swaps** via the registry in `themes/index.ts` — for screens whose visual *tree* genuinely diverges (different layout, different copy, different motion). **Last resort**, not first.

A theme that just changes colors touches only layer 1. A theme like Stamp — whose visual identity is "1.5px sumi border + 3px hard offset shadow + crisp 2px corners + serif" — touches layer 1 + layer 2 and registers a few layer-3 screens.

> If you find yourself wanting a layer-3 swap to change a card border or a button shadow, **stop**. That's a layer-2 token.

---

## Step-by-step: a colors-only theme

The minimum viable theme is one record entry + one CSS file. Everything else is derived.

### 1. Add the record entry

In [components/providers/ThemeProvider.tsx](components/providers/ThemeProvider.tsx), append to `THEMES`:

```ts
export const THEMES = {
  // …existing entries
  midnight: {
    label: 'Midnight',
    description: 'Indigo-on-charcoal, late-night reading',
    premium: true,
    swatch: {
      bg:      '#0E0F14',
      bgElev:  '#171922',
      fg:      '#E8ECF5',
      fgMuted: '#8B92A6',
      accent:  '#7DA8FF',
      border:  'rgba(232,236,245,0.10)',
    },
  },
} as const satisfies Record<string, ThemeMeta>;
```

That single edit cascades:
- `AppTheme = keyof typeof THEMES` automatically widens.
- `THEME_NAMES` automatically includes it.
- The pre-hydration script's allow-list in `app/layout.tsx` includes it on next build.
- The storage validator (`isAppTheme`) accepts it.
- `ThemeSwitcher` (which iterates `Object.keys(THEMES)`) shows it.
- `themes/index.ts` registry **forces** you to add a `midnight: { … }` entry — empty `{}` is fine for colors-only.

### 2. Create the CSS file

`styles/themes/midnight.css`:

```css
html[data-theme="midnight"] {
  --lgc-bg:            #0E0F14;
  --lgc-bg-elev:       #171922;
  --lgc-bg-sunken:     #0A0B10;

  --lgc-fg:            #E8ECF5;
  --lgc-fg-muted:      #8B92A6;
  --lgc-fg-subtle:     #5C6273;

  --lgc-border:        rgba(232,236,245,0.10);
  --lgc-border-strong: rgba(232,236,245,0.18);

  --lgc-accent:        #7DA8FF;
  --lgc-accent-soft:   rgba(125,168,255,0.18);
  --lgc-accent-fg:     #0E0F14;

  --lgc-success:       #6CC58A;
  --lgc-warning:       #E0B05A;
  --lgc-error:         #D97757;
}
```

Don't omit any color from this list. Anything you skip falls through to `:root` (the Default theme's values), which produces visual mismatches.

Import it in [app/globals.css](app/globals.css) next to the other themes:

```css
@import "../styles/themes/midnight.css";
```

### 3. Register in the component registry

In [themes/index.ts](themes/index.ts), add to the registry:

```ts
export const themeComponentRegistry: Record<AppTheme, ThemeComponentMap> = {
  default: {},
  kanagawa: {},
  sakura: {},
  hanami: {},
  stamp:    { … },
  midnight: {},   // ← add
};
```

TypeScript already requires this — leaving it out is a compile error because `Record<AppTheme, …>` is exhaustive.

### 4. Done.

That's a complete colors-only theme. Walk every screen with the new theme active. You should see a coherent palette swap and zero visual breaks. If you spot a hex literal somewhere that didn't move, that's a bug in the *component*, not your theme — file a quick PR to make that surface read tokens.

---

## Step-by-step: a shape-bending theme (the Stamp playbook)

For themes whose identity goes beyond color — different border treatment, different shadow, different radius scale, different fonts — add overrides for the **shape tokens**. The full inventory lives in [`styles/shape-defaults.css`](styles/shape-defaults.css). Copy what you need into your theme's CSS block.

### Surface (cards, panels, popovers)

These are read by `.lgc-card` and any inline `style` that pulls them. Every modal, popover, panel goes through `.lgc-card` after the Fix-1 sweep, so overriding here changes *all* of them at once.

```css
html[data-theme="midnight"] {
  /* …palette… */

  --lgc-surface-bg:           var(--lgc-bg-elev);
  --lgc-surface-border-color: rgba(232,236,245,0.18);
  --lgc-surface-border-width: 1px;
  --lgc-surface-border-style: solid;
  --lgc-surface-radius:       12px;
  --lgc-surface-shadow:       0 4px 20px rgba(0,0,0,0.4);
}
```

For a Stamp-style "uneven" border:

```css
--lgc-surface-border-width: 1.5px 2px 2.5px 1.5px;   /* T R B L */
--lgc-surface-radius:       2px;
--lgc-surface-shadow:       3px 3px 0 var(--lgc-fg);  /* hard offset */
```

### Buttons

`.lgc-button` is the primary (accent fill); `.lgc-button-secondary` is the bordered/ghost. Both share token-driven geometry:

```css
/* Primary */
--lgc-button-bg:             var(--lgc-accent);
--lgc-button-fg:             var(--lgc-accent-fg);
--lgc-button-border-color:   transparent;
--lgc-button-border-width:   0;
--lgc-button-radius:         6px;
--lgc-button-shadow:         none;
--lgc-button-padding:        8px 16px;
--lgc-button-font-family:    inherit;
--lgc-button-font-size:      14px;
--lgc-button-font-weight:    500;
--lgc-button-letter-spacing: 0;
--lgc-button-text-transform: none;

/* Secondary */
--lgc-button-secondary-bg:           transparent;
--lgc-button-secondary-fg:           var(--lgc-fg);
--lgc-button-secondary-border-color: var(--lgc-border);
--lgc-button-secondary-border-width: 1px;
--lgc-button-secondary-hover-bg:     var(--lgc-accent-soft);
```

Stamp's primary buttons are `var(--lgc-accent)` filled with a 1px sumi border and a 2px hard offset shadow:

```css
--lgc-button-border-color:   var(--lgc-fg);
--lgc-button-border-width:   1px;
--lgc-button-radius:         2px;
--lgc-button-shadow:         2px 2px 0 var(--lgc-fg);
--lgc-button-letter-spacing: 0.04em;
--lgc-button-padding:        10px 18px;
--lgc-button-font-family:    var(--lgc-font-display);
```

### Pressable interaction

The hover/active transforms on `.lgc-button` and `.lgc-pressable`:

```css
--lgc-press-transform-hover:  translate(1px, 1px);
--lgc-press-shadow-hover:     1px 1px 0 var(--lgc-fg);
--lgc-press-transform-active: translate(2px, 2px);
--lgc-press-shadow-active:    0 0 0 var(--lgc-fg);
```

Soft themes leave these at the defaults (`none` transform, surface shadow).

### Chips

`.lgc-chip` is the badge / tag:

```css
--lgc-chip-bg:             var(--lgc-bg-sunken);
--lgc-chip-fg:             var(--lgc-fg-muted);
--lgc-chip-border-color:   transparent;
--lgc-chip-border-width:   0;
--lgc-chip-radius:         999px;
--lgc-chip-padding:        2px 8px;
--lgc-chip-font-size:      11px;
--lgc-chip-letter-spacing: 0.02em;
--lgc-chip-font-weight:    500;
--lgc-chip-text-transform: none;
```

Stamp's chips are sumi-bordered uppercase mono caps:

```css
--lgc-chip-bg:             var(--lgc-bg);
--lgc-chip-border-color:   var(--lgc-fg);
--lgc-chip-border-width:   1.25px;
--lgc-chip-radius:         0;
--lgc-chip-letter-spacing: 0.12em;
--lgc-chip-text-transform: uppercase;
```

### Toolbar

The reader / dictionary / study-session top bars:

```css
--lgc-toolbar-bg:                    color-mix(in oklab, var(--lgc-bg) 85%, transparent);
--lgc-toolbar-backdrop-filter:       blur(10px);
--lgc-toolbar-button-radius:         6px;
--lgc-toolbar-button-tracking:       normal;
--lgc-toolbar-button-text-transform: none;
--lgc-toolbar-button-font-family:    inherit;
```

Stamp flattens the glass:

```css
--lgc-toolbar-bg:                    var(--lgc-bg-elev);
--lgc-toolbar-backdrop-filter:       none;
--lgc-toolbar-button-radius:         0;
--lgc-toolbar-button-tracking:       0.18em;
--lgc-toolbar-button-text-transform: uppercase;
--lgc-toolbar-button-font-family:    var(--lgc-font-mono);
```

### Section labels & meaning numerals

Used by `WordDetailView`, `DictionaryView`, and any "01 — Meanings" section header:

```css
--lgc-section-label-color:    var(--lgc-accent);
--lgc-section-label-tracking: 0.16em;
--lgc-section-label-weight:   600;

--lgc-section-num-color:      var(--lgc-fg-subtle);
--lgc-section-num-tracking:   normal;

--lgc-meaning-num-font:        var(--lgc-font-mono);
--lgc-meaning-num-size:        13px;
--lgc-meaning-num-weight:      600;
--lgc-meaning-num-line-height: normal;
--lgc-meaning-num-min-width:   auto;
--lgc-meaning-num-padding-top: 2px;
--lgc-meaning-padding-bottom:  0;
```

Stamp pumps these up to 26px serif vermillion numerals — change the size/font/color and the rest of the layout absorbs it without any component edits.

### Dictionary list rows

Reading colors and tracking on result rows:

```css
--lgc-row-reading-color:    var(--lgc-fg-muted);
--lgc-row-reading-tracking: normal;
```

### Form atoms / generic radii

```css
--lgc-input-radius:        8px;
--lgc-kbd-radius:           3px;
--lgc-icon-button-radius:   6px;
--lgc-pill-radius:          9999px;
--lgc-divider-style:        solid;   /* set to `dashed` for an old-print look */
```

### Fonts

Five aliases. Override any of them per theme:

```css
--lgc-font-display: var(--font-source-serif), Georgia, serif;
--lgc-font-ui:      var(--font-inter), system-ui, sans-serif;
--lgc-font-mono:    var(--font-geist-mono), ui-monospace, monospace;
--lgc-font-body:    var(--lgc-font-ui);
--lgc-font-jp:      var(--lgc-font-display);
```

Stamp uses the Editorial Mincho pairing: Shippori Mincho display, Cormorant Garamond UI, DM Mono. Those font families are **already loaded** in `app/layout.tsx` via `next/font/google` — if you want a font your theme alone uses, add it there too.

### Tailwind radius scale

If your theme has a categorically different radius vibe (Stamp = crisp 1–8px corners), override the global Tailwind scale in your theme's CSS block:

```css
--radius-sm:  1px;
--radius-md:  2px;
--radius-lg:  2px;
--radius-xl:  3px;
--radius-2xl: 4px;
--radius-3xl: 6px;
--radius-4xl: 8px;
```

This single block flattens every `rounded-*` class app-wide under your theme. Don't sprinkle inline `borderRadius: <px>` — components that need theming use either `rounded-md` (Tailwind) or `style={{ borderRadius: 'var(--radius-md)' }}` (raw CSS) so this scale flows through.

---

## When you actually need to override a screen

Sometimes the **tree itself** has to change — not just a border or a font. A few places where Stamp does this:

- `themes/stamp/home/HomeView.tsx` — replaces the home grid layout with perforated stamp cards in a paper-grid arrangement.
- `themes/stamp/views/ReaderView.tsx` — different library shell + onboarding chrome.
- `themes/stamp/page-bubbles/{ProfileBubble,ReaderBubble}.tsx` — passport-card layout instead of soft-shell pill.

The pattern:

### 1. Drop the variant file

`themes/midnight/home/HomeView.tsx`:

```tsx
'use client';

// import { useAuthedUser } from '@/components/providers/useAuthedUser';
// …
export default function MidnightHomeView() {
  // entirely new tree — share business logic with the default by importing
  // the same hooks; only the JSX changes.
}
```

Mirror the path under `components/` so it's findable. Anything you import from `@/components/...` is fair game — the default's hooks, helpers, sub-components.

### 2. Add a slot type (if absent)

In `themes/index.ts`, add to `ThemeComponentMap`:

```ts
export type ThemeComponentMap = Partial<{
  // …
  HomeView: ComponentType<ComponentProps<typeof DefaultHomeView>>;
}>;
```

The slot's prop shape is locked to the default's — variants can't drift.

### 3. Register it

```ts
import MidnightHomeView from './midnight/home/HomeView';

export const themeComponentRegistry: Record<AppTheme, ThemeComponentMap> = {
  // …
  midnight: { HomeView: MidnightHomeView },
};
```

### 4. Add the resolver (one-time, per slot)

If the default component already has an `index.tsx` resolver, you're done. If not (i.e. you just promoted it), add a one-line resolver next to the default:

```tsx
// components/home/HomeView/index.tsx
'use client';
import { useThemedComponent } from '@/themes/useThemedComponent';
import DefaultHomeView from './HomeView';

export default function HomeView(props: React.ComponentProps<typeof DefaultHomeView>) {
  const Resolved = useThemedComponent('HomeView', DefaultHomeView);
  return <Resolved {...props} />;
}
```

Callers `import HomeView from '@/components/home/HomeView'` and get the right variant per active theme. No call-site changes needed when you add another theme later.

---

## Theme-specific decoration atoms

Sometimes a theme has signature visual flourishes — Stamp's hanko seals, postmarks, perforated edges. Those don't fit shape tokens (they're shapes, not properties of an existing surface). They go in:

```
components/theme-decorations/<theme>/<Atom>.tsx
```

…and are imported directly by the theme's screen variants. Stamp's atoms:

- `HankoSeal` — square red kanji seal, rotated
- `Postmark` — concentric red rings + label
- `PerforationStrip` — radial-gradient dot pattern
- `StampMark` — hero masthead seal
- `Denomination` — vermillion serif numerals + mono caption

If your theme has a similar set, mirror this layout. **Don't** make these registry slots — they're imported on demand, not dispatched.

For places where you want an atom to appear *only* under a specific theme, wrap it in `<ThemedDecoration theme="midnight">`:

```tsx
import { ThemedDecoration } from '@/components/theme-decorations/ThemedDecoration';
// …
<ThemedDecoration theme="midnight">
  <MoonPhase />
</ThemedDecoration>
```

It returns null under any other theme. Used in `WordDetailView` for the Stamp postmark corner decoration.

---

## Decision rule (when to reach for what)

| Need | Tool |
|---|---|
| Different colors | Color tokens in your theme's CSS file |
| Different border / shadow / radius / font on cards, buttons, chips, toolbars, section labels, etc. | Shape tokens in your theme's CSS file |
| A signature decorative atom that doesn't exist anywhere else | New file in `components/theme-decorations/<theme>/` + `<ThemedDecoration>` to render it |
| Whole-screen layout / motion / copy divergence | Variant file in `themes/<theme>/<path>/` + registry slot in `themes/index.ts` |

If two registry variants of the same component differ by 1–5 lines, you've made a token mistake — go back and add the missing token instead.

---

## Validation checklist

After adding a theme, walk through this:

- [ ] `THEMES` record entry added in `ThemeProvider.tsx` with `label`, `description`, `premium`, full `swatch`.
- [ ] CSS file at `styles/themes/<name>.css` declares **every** `--lgc-*` color token.
- [ ] CSS file imported in `app/globals.css`.
- [ ] Registry entry added in `themes/index.ts` (empty `{}` if no whole-screen swaps).
- [ ] `ThemeSwitcher` shows the new theme without code changes (verify visually).
- [ ] Toggle to the new theme; visit every primary surface:
  - [ ] Home / library
  - [ ] Reader (text + manga)
  - [ ] Dictionary (search + word detail)
  - [ ] Decks list, deck detail, deck form, study session, summary
  - [ ] Profile (account, decks, devices, theme picker)
  - [ ] DeepL popup, AvatarPicker, OnboardingExplainer modal
  - [ ] Reader bubble (over reader page)
- [ ] No hex literals leak through. If a surface "doesn't change," grep its file for `#[0-9a-f]{6}` — that's the bug, fix the component to read tokens.
- [ ] `npm run build` clean. `npx tsc --noEmit` clean.

If you're shipping a heavyweight theme like Stamp:

- [ ] Hard offset shadows render correctly (no z-index clipping). Stamp shadows live on the parent of overflow-hidden surfaces.
- [ ] Font weights you reference exist in the next/font/google import; add them to `app/layout.tsx` if missing.
- [ ] The pre-hydration script in `app/layout.tsx` allows your theme name (auto-derived from `THEMES` — verify by toggling on a fresh tab).
- [ ] Theme decoration atoms are imported by screen variants only when this theme is active (use `<ThemedDecoration>`).

---

## Anti-patterns

These bite repeatedly. Don't do them.

- **`if (theme === 'midnight') …` inside a component.** Either move the variation to a token, or fork the screen via the registry. Inline conditionals are forbidden.
- **`style={{ borderRadius: 12 }}` on a surface that should adapt.** Use `rounded-xl` (Tailwind) or `var(--radius-xl)` (raw CSS).
- **Two registry variants that differ by a `style` prop.** That's a token, not a fork.
- **Importing `useTheme()` to read `theme.label` for display.** Use `THEMES[theme].label` from the record — `useTheme` is for the dispatching path, not lookups.
- **Adding a registry slot you don't intend to override.** It costs a resolver file and confuses the system. Skip the slot until at least one theme actually needs it.
- **Hex literal in a component.** The only acceptable hex literals are in `JlptChip` (per-level palette by design) and theme decoration atoms.

---

## Reference

- Token inventory + per-token consumer list — [THEMES.md](THEMES.md)
- Shape-token defaults — [styles/shape-defaults.css](styles/shape-defaults.css)
- Primitive classes that read shape tokens — [styles/primitives.css](styles/primitives.css)
- Registry — [themes/index.ts](themes/index.ts)
- Resolver hook — [themes/useThemedComponent.ts](themes/useThemedComponent.ts)
- Conditional render helper — [components/theme-decorations/ThemedDecoration.tsx](components/theme-decorations/ThemedDecoration.tsx)
- Theme picker — [components/profile/ThemeSection.tsx](components/profile/ThemeSection.tsx)
- Pre-hydration script — see `THEME_INIT_SCRIPT` in [app/layout.tsx](app/layout.tsx)
