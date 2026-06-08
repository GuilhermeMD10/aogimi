'use client';

import { useRouter } from 'next/navigation';
import HelpView from '@/components/views/HelpView/HelpView';

// Standalone /help route. The bubble flow swaps to HelpView inside
// itself rather than navigating here; this route is for deep links.
export default function HelpPage() {
  const router = useRouter();
  return <HelpView onBack={() => router.back()} />;
}
