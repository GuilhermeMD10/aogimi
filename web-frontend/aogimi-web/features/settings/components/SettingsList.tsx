import type { ReactNode } from 'react';
import { GlassCard, HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { AboutRow } from './AboutRow';
import { DeleteAccountRow } from './DeleteAccountRow';
import { SkyHueRow } from './SkyHueRow';
import { ThemeRow } from './ThemeRow';

const ABOUT_ROWS = [
  {
    href: '/help',
    label: 'Help',
    jp: '',
    description: 'What the app is, reading, the dictionary, decks, and how sync works.',
  },
  {
    href: '/credits',
    label: 'Credits',
    jp: '',
    description: 'The language data, typefaces, and open-source software this app ships.',
  },
] as const;

/**
 * Every setting the app has, as one running list — this replaced the `/settings`
 * route, which was four paper cards under four eyebrows on a page of its own.
 * It sits beside the account card on /profile, and the two together are the
 * whole account surface: there is no settings page to navigate to any more, and
 * Help and Credits (still their own routes) are entered from here.
 *
 * A single `GlassCard` rather than a card per group, deliberately: five rows
 * across four unrelated concerns did not need four surfaces to separate them,
 * and the ruled list is what the profile column already reads as. Every row
 * carries a hairline above it because the title block is always first, so
 * `Ruled` is unconditional — no first-child exception to keep in step.
 */
export function SettingsList() {
  return (
    <GlassCard aria-labelledby="profile-settings">
      <div className="px-6 pt-5 pb-3.5">
        <h2 id="profile-settings" className="font-[family-name:var(--face-ui)] text-[22px] font-bold text-(--ink)">
          Settings
        </h2>
      </div>

      <Ruled>
        <ThemeRow />
      </Ruled>
      <Ruled>
        <SkyHueRow />
      </Ruled>
      {ABOUT_ROWS.map((row) => (
        <Ruled key={row.href}>
          <AboutRow {...row} />
        </Ruled>
      ))}
      <Ruled>
        <DeleteAccountRow />
      </Ruled>
    </GlassCard>
  );
}

/**
 * The rule between rows. It belongs to the list, not to the row: a row that
 * drew its own edge would have to know whether it is first, and the colour has
 * to be stated literally anyway (`border-color` isn't inherited, and the base
 * layer's `*` rule gives every element its own).
 */
function Ruled({ children }: { children: ReactNode }) {
  return <div className={cn('border-t', HAIRLINE)}>{children}</div>;
}
