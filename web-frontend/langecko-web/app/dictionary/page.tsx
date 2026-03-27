import DictionaryView from '@/components/views/DictionaryView';
import SinglePageWorkspace from '@/components/workspace/SinglePageWorkspace';

export default function DictionaryPage() {
  return (
    <SinglePageWorkspace tab="dictionary">
      <DictionaryView />
    </SinglePageWorkspace>
  );
}
