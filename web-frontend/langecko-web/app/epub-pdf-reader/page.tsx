import EpubPdfReaderView from '@/components/views/EpubPdfReaderView';
import SinglePageWorkspace from '@/components/workspace/SinglePageWorkspace';

export default function EpubPdfReaderPage() {
  return (
    <SinglePageWorkspace tab="reader">
      <EpubPdfReaderView />
    </SinglePageWorkspace>
  );
}
