import type { Metadata } from 'next';
import { PrivacyView } from '@/features/settings';

export const metadata: Metadata = {
  title: 'Privacy policy · Aogimi',
  description: 'What Aogimi stores about you, where, and how to delete it.',
};

// /privacy — the settings shell showing the privacy policy. The one public
// route: the store listings link here, so it opens signed out and on a phone
// (features/app-shell/lib/publicRoutes.ts).
export default function PrivacyPage() {
  return <PrivacyView />;
}
