'use client';

import { useRouter } from 'next/navigation';
import CreditsView from '@/components/views/CreditsView/CreditsView';

// Standalone /credits route. The bubble flow swaps to CreditsView inside
// itself rather than navigating here; this route is for deep links.
export default function CreditsPage() {
  const router = useRouter();
  return <CreditsView onBack={() => router.back()} />;
}
