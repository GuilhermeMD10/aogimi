'use client';

import { useRouter } from 'next/navigation';
import { SettingsView } from '@/features/settings';

// Standalone /settings route. The bubble flow renders SettingsView
// directly (see features/settings/settings-bubble) so the user
// stays in the bubble; this route is here for deep-link reachability.
export default function SettingsPage() {
  const router = useRouter();
  return (
    <SettingsView
      onOpenHelp={() => router.push('/help')}
      onOpenCredits={() => router.push('/credits')}
    />
  );
}
