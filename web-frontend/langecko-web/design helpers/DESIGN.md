# Design System Strategy: The Fluid Lifestyle

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Soft Curator."** 

Moving away from the rigid, scholarly structures of traditional archives, this system embraces the "modern lifestyle" aesthetic. It is defined by breathability, approachable geometry, and a sense of effortless organization. We break the "template" look by favoring **intentional asymmetry** and **tonal layering** over traditional grid lines and boxes. The experience should feel like flipping through a high-end, contemporary indie magazine—spacious, tactile, and human-centric.

By utilizing extreme corner radii (`xl: 3rem`) and a vibrant teal-centric palette, we shift the emotional response from "study" to "discovery."

---

## 2. Colors & Surface Philosophy
Our palette is a sophisticated blend of cool neutrals and a high-energy teal accent (`#006a67`). 

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. They create visual noise and feel "engineered." Instead, boundaries must be defined through **Background Color Shifts**. 
*   **Example:** A `surface-container-low` section sitting directly on a `surface` background. The change in tone is the boundary.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers to define "importance" through depth rather than lines:
*   **Base:** `surface` (#f7fafa)
*   **Secondary Content:** `surface-container-low` (#f1f4f4)
*   **Interactive Cards:** `surface-container-lowest` (#ffffff) to provide a "pop" of clean white against the neutral base.
*   **Persistent Elements:** `surface-container-high` (#e6e9e9) for navigation bars or sidebars.

### The Glass & Gradient Rule
To achieve a "Lifestyle" polish, use **Glassmorphism** for floating elements (like Modals or Floating Action Buttons). Combine `surface_container_lowest` at 70% opacity with a `backdrop-blur` of 20px. 
*   **Signature Texture:** For hero sections or primary CTAs, use a subtle linear gradient from `primary` (#006a67) to `primary_container` (#12b5b0) at a 135-degree angle. This adds "soul" and depth that a flat fill cannot replicate.

---

## 3. Typography
The typography strategy transitions from "Academic" to "Contemporary Editorial" by pairing two clean sans-serifs.

*   **Display & Headlines (Public Sans):** Chosen for its neutral yet friendly geometric structure. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create a bold, confident lifestyle statement.
*   **Body & Labels (Inter):** Inter provides maximum legibility for functional content. 
*   **The Hierarchy Goal:** Use high contrast in scale. A `display-md` headline should be paired with a much smaller `body-md` description. This "Editorial Gap" creates a premium, curated feel. Avoid mid-range sizes that make the UI look like a generic dashboard.

---

## 4. Elevation & Depth
We eschew the "Material 2" style of heavy drop shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. This creates a "Natural Lift" that feels light and modern.
*   **Ambient Shadows:** If an element must float (e.g., a menu), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(24, 28, 29, 0.06)`. The shadow color is a tinted version of `on-surface`, never pure black.
*   **The "Ghost Border" Fallback:** If a divider is required for accessibility, use the `outline-variant` (#bbc9c8) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Uses the `xl` (3rem) corner radius. Background is the `primary` gradient. Text is `on-primary` (#ffffff) using `title-sm` weight.
*   **Secondary:** No fill. Uses a `Ghost Border` (outline-variant at 20%) and `primary` colored text.

### Cards & Lists
*   **Rule:** Forbid divider lines. Use `spacing-8` (2rem) of vertical white space to separate list items.
*   **Cards:** Use `surface-container-lowest` with a corner radius of `lg` (2rem). Content inside should have a padding of `spacing-6` (1.5rem).

### Inputs
*   **Style:** Minimalist. `surface-container-highest` background with a `none` border. On focus, transition the background to `surface-container-lowest` and add a subtle 2px `primary` bottom-bar.

### Chips (Lifestyle Tags)
*   **Style:** Pill-shaped (`full` roundedness). Use `secondary_container` (#bcece8) for the background to keep the interface feeling "fresh" and "airy."

### Icons
*   **System:** Use "Material Symbols Rounded" (Weight: 400). Icons should be treated as secondary visual cues, never larger than the text they accompany.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** embrace white space. If a section feels crowded, increase spacing to `spacing-12` or `spacing-16`.
*   **Do** use asymmetrical layouts. Place a large `display-sm` headline on the left and a small `body-md` block shifted to the right to create "Visual Rhythm."
*   **Do** use the `primary_fixed` (#72f7f1) color for subtle background glows behind key lifestyle imagery.

### Don’t:
*   **Don’t** use 1px solid black or grey borders. This immediately kills the "Premium Lifestyle" vibe.
*   **Don’t** use sharp corners (`none` or `sm`). Everything in this system should feel soft to the touch.
*   **Don’t** use high-contrast shadows. If the shadow is the first thing you see, it’s too heavy. Reduce opacity until it’s barely perceptible.