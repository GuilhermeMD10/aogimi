import { DictionaryPage } from '@/components/dictionary/DictionaryPage';

/**
 * Full-page Dictionary tab.
 *
 * Rendered when the user taps the Dictionary tab. The overlay drawer
 * (`DictionaryDrawer` at the root) still exists and is opened from the reader
 * for in-context lookups — this tab is the "sit down with it" surface where
 * Search and Saved words get the full screen.
 */
export default function DictionaryTab() {
  return <DictionaryPage />;
}
