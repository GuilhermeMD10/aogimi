/**
 * The sky domain — the star map of the reader's cards, the page it lives on, and studying them.
 *
 * A domain with three sub-features, siblings each with their own barrel (the `books` arrangement):
 *
 *   `map/`    the star map itself: the platform-free generation lib, the web camera/frame hooks and
 *             the SVG renderer. Knows nothing about decks, routes or the API — hand it a seed and
 *             card rows and it draws. Written to be copied to mobile as-is; see `map/lib/README.md`.
 *   `stage/`  the `/sky` page that composes the map with glass chrome, plus the deck data layer
 *             behind it (`DecksProvider`, `decksApi`, the quota caps, `CardDraft`). Half the app
 *             borrows that vocabulary, which is why its barrel is the widest of the three.
 *   `study/`  reviewing the cards — the `/study` session runner and the stats it reads.
 *
 * **Only the two route entry points live here.** Everything else is imported from the sub-barrel
 * that owns it (`@/features/sky/map`, `/stage`, `/study`), the same way `books/library` and
 * `books/reader` are addressed — a domain barrel that re-exported all three would put the whole
 * sky in the bundle of anything that wanted one type off it.
 */
export { SkyView } from './stage';
export { StudyView } from './study';
