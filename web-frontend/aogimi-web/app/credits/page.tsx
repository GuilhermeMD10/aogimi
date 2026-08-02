import { CreditsView } from '@/features/settings';

// /credits — the settings shell showing attribution. Several data licenses
// require this page to exist; the list lives in features/settings/lib/credits.ts.
export default function CreditsPage() {
  return <CreditsView />;
}
