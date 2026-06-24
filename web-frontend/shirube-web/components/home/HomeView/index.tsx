'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import DefaultHomeView from './HomeView';

export default function HomeView() {
  const Resolved = useThemedComponent('HomeView', DefaultHomeView);
  return <Resolved />;
}
