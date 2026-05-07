'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import { StudyView as DefaultStudyView, type StudyViewProps } from './StudyView';

export type { StudyViewProps } from './StudyView';

export function StudyView(props: StudyViewProps) {
  const Resolved = useThemedComponent('StudyView', DefaultStudyView);
  return <Resolved {...props} />;
}
