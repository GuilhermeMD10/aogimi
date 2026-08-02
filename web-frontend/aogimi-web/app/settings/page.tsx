import { SettingsView } from '@/features/settings';

// /settings — reached from the Settings button on /profile. Help and Credits
// are sibling routes rendering the same shell, so the three read as one page
// whose panel column swaps.
export default function SettingsPage() {
  return <SettingsView />;
}
