'use client';

import { TopBar } from '@/features/app-shell/TopBar';
import { SettingsList } from '@/features/settings';
import { AccountCard } from '../components/AccountCard';
import { IdentityCard } from '../components/IdentityCard';

/**
 * `/profile` — the account page and, since the `/settings` route was removed,
 * the settings page too. A record, not a dashboard: no charts, no streaks, only
 * things that are real.
 *
 * Composition and grid geometry only — every card owns its own request, so one
 * slow query can't hold up the page. `TopBar` is rendered here, inside the
 * page's own 1300px column, and the bottom padding clears the fixed dock.
 *
 * Two columns: the account card on the left, and the settings list on the right,
 * which is the wider one because its rows are label-left / control-right. Below
 * `lg` they stack in that order — account, then settings.
 */
export default function ProfileView() {
  return (
    <div className="h-full w-full overflow-auto font-(family-name:--face-ui) font-medium">
      <div className="mx-auto w-full max-w-325 px-11 pt-8.5 pb-35">
        <TopBar />

        <IdentityCard />

        <div className="grid items-start gap-6.5 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.55fr)]">
          <AccountCard />

          <SettingsList />
        </div>
      </div>
    </div>
  );
}
