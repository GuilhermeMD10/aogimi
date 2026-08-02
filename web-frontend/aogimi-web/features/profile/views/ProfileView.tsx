'use client';

import { TopBar } from '@/features/app-shell/TopBar';
import { AccountCard } from '../components/AccountCard';
import { BooksReadCard } from '../components/BooksReadCard';
import { DecksKeptCard } from '../components/DecksKeptCard';
import { IdentityCard } from '../components/IdentityCard';

/**
 * `/profile` — the account page and the reading record in one. A record, not
 * a dashboard: no charts, no streaks, only counts of real things.
 *
 * Composition and grid geometry only — every card owns its own request, so one
 * slow query can't hold up the page. Same column discipline as home: `TopBar`
 * is rendered here, inside the page's own 1300px column, and `pb-[140px]`
 * clears the fixed bottom nav.
 *
 * The grid collapses below `lg` in the order Account → Decks → Books. The
 * right column's `minmax(0, …)` stops long book rows forcing the grid wider
 * than the page; the left `minmax(340px, …)` keeps the deck rows from
 * crushing.
 */
export default function ProfileView() {
  return (
    <div className="h-full w-full overflow-auto font-[family-name:var(--face-ui)] font-medium">
      <div className="mx-auto w-full max-w-[1300px] px-11 pt-[34px] pb-[140px]">
        <TopBar />

        <IdentityCard />

        <div className="grid items-start gap-[26px] lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.55fr)]">
          <div className="flex flex-col gap-[26px]">
            <AccountCard />
            <DecksKeptCard />
          </div>
          <BooksReadCard />
        </div>
      </div>
    </div>
  );
}
