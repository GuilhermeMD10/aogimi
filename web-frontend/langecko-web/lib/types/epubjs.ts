// Typed accessors for epubjs internals that aren't on the upstream public API.
//
// epubjs ships its own .d.ts files but they miss several runtime-accessible
// properties (e.g. `Spine.spineItems`, `Rendition.q`, the `Location` numeric
// shape). Each helper here narrows one access pattern with a single cast,
// so the reader engines can drop their scattered `as any` ladders.

import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import type { NavItem } from '@/components/reader/TocPanel';

// ── Spine ────────────────────────────────────────────────────────────────────

export interface EpubSpineItem {
  index: number;
  href: string;
  cfiBase?: string;
}

interface SpineInternals {
  spineItems?: EpubSpineItem[];
  get(cfi: string): EpubSpineItem | undefined;
}

export function getSpineItems(book: Book): EpubSpineItem[] {
  return (book.spine as unknown as SpineInternals).spineItems ?? [];
}

export function getSpineSection(book: Book, cfi: string): EpubSpineItem | undefined {
  return (book.spine as unknown as SpineInternals).get(cfi);
}

// ── Navigation ───────────────────────────────────────────────────────────────

export function getNavigationToc(book: Book): NavItem[] {
  if (!book.navigation) return [];
  return ((book.navigation as unknown as { toc?: NavItem[] }).toc) ?? [];
}

// ── Locations (typed against runtime, not the optimistic upstream signatures) */

interface EpubLocations {
  generate(charsPerPage: number): Promise<string[]>;
  /** Upstream typing claims `Location` (a class); runtime returns a number index. */
  locationFromCfi(cfi: string): number;
  /** Upstream typing claims `string`; runtime can return -1 when not yet generated. */
  cfiFromLocation(loc: number): string | -1;
}

export function getLocations(book: Book): EpubLocations {
  return (book as unknown as { locations: EpubLocations }).locations;
}

// ── Themes ───────────────────────────────────────────────────────────────────

export interface EpubThemeStyles {
  body?: Record<string, string>;
  '*'?: Record<string, string>;
  [selector: string]: Record<string, string> | undefined;
}

interface EpubThemes {
  default(styles: EpubThemeStyles): void;
}

export function getThemes(rendition: Rendition): EpubThemes {
  return rendition.themes as unknown as EpubThemes;
}

// ── Annotations ──────────────────────────────────────────────────────────────

export type EpubAnnotationType = 'highlight' | 'underline' | 'mark';

export interface EpubAnnotations {
  add(
    type: EpubAnnotationType,
    cfi: string,
    data: { id: string },
    cb: undefined,
    className: string,
    styles: Record<string, string>,
  ): void;
  remove(cfi: string, type: EpubAnnotationType): void;
}

export function getAnnotations(rendition: Rendition | null): EpubAnnotations | undefined {
  if (!rendition) return undefined;
  return rendition.annotations as unknown as EpubAnnotations | undefined;
}

// ── Rendition internal queue (used during teardown to cancel pending start) */

export function clearRenditionQueue(rendition: Rendition): void {
  (rendition as unknown as { q?: { clear: () => void } }).q?.clear();
}
