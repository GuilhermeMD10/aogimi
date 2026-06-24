'use client';

import { useRouter } from 'next/navigation';
import SettingsView from '@/components/views/SettingsView/SettingsView';

// Standalone /settings route. The bubble flow renders SettingsView
// directly (see components/page-bubbles/SettingsBubble) so the user
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
