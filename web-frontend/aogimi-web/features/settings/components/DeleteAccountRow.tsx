'use client';

import { useState } from 'react';
import { GLASS_GHOST } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { SettingRow } from './SettingRow';

/**
 * The last row in the settings list, and the only red one. The typed confirm
 * lives in `DeleteAccountDialog`, mounted on demand so every open starts fresh.
 *
 * Sign out is deliberately not here: it is the button on /profile's account
 * card, one row away, and two of them on one page reads as two different
 * actions. Nor is there a signed-out branch — `AppShell` redirects a signed-out
 * visitor to /authenticate before this page renders.
 *
 * Glass like the rest of the list, keeping only the `--danger` edge and ink,
 * because destructive is semantics rather than decoration — same call the
 * account card's sign out makes.
 */
export function DeleteAccountRow() {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <SettingRow
        danger
        title="Delete account"
        description="Deletes your account and everything in it — decks, cards, books, and reading progress. This cannot be undone."
        control={
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={cn(GLASS_GHOST, 'border-(--danger-bd) text-(--danger)')}
          >
            Delete account
          </button>
        }
      />
      {confirming && <DeleteAccountDialog onClose={() => setConfirming(false)} />}
    </>
  );
}
