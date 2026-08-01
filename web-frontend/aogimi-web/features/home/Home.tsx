'use client';

import { TopBar } from '@/features/app-shell/TopBar';
import { HeroBanner } from './components/HeroBanner';
import {
  ContinueReadingCard,
  DecksPanel,
  DictionaryCard,
  LibraryCard,
  StudyCard,
} from './components/HomeCards';

/**
 * `/` — the dashboard. Composition and grid geometry only; it fetches nothing
 * itself, because every card owns its own request so one slow query can't hold
 * up the rest of the page.
 *
 * The column is the page's own, not the layout's: `TopBar` is shared chrome but
 * it's rendered *here*, inside this column, so it lines up with the content
 * below it and so screens that haven't been redesigned don't inherit it. A page
 * opts in by rendering it.
 *
 * `pb-[140px]` clears the fixed bottom nav.
 *
 * Rows collapse to one column below `lg` (1024px). The design targets ≥1100px
 * and below 700px never reaches the web app at all — `MobileGate` sends every
 * touch device to the native apps — so `lg` is the only breakpoint needed.
 */
export default function Home() {
  return (
    <div className="h-full w-full overflow-auto font-[family-name:var(--face-ui)] font-medium">
      <div className="mx-auto w-full max-w-[1300px] px-11 pt-[34px] pb-[140px]">
        <TopBar />

        <HeroBanner />

        <div className="mb-[26px] grid gap-[26px] lg:grid-cols-2">
          <ContinueReadingCard />
          <StudyCard />
        </div>

        <div className="mb-[26px] grid gap-[26px] lg:grid-cols-[1.1fr_1fr]">
          <LibraryCard />
          <DictionaryCard />
        </div>

        <DecksPanel />
      </div>
    </div>
  );
}
