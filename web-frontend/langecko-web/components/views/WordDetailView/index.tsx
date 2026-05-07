'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import DefaultWordDetailView from './WordDetailView';

export { preferredHeadword } from './WordDetailView';

type Props = React.ComponentProps<typeof DefaultWordDetailView>;

export default function WordDetailView(props: Props) {
  const Resolved = useThemedComponent('WordDetailView', DefaultWordDetailView);
  return <Resolved {...props} />;
}
