'use client';

import { Suspense } from 'react';
import ReaderView from '@/components/views/ReaderView';
import DictionaryView from '@/components/views/DictionaryView';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

// Fixed two-pane workspace: Reader on the left (always at least 50%), the
// companion pane on the right (Dictionary today). Both panes read from their
// existing providers, so each shows whatever state it had when the user last
// touched it elsewhere.
export default function WorkspacePage() {
  return (
    <Suspense>
      <div className="flex h-full min-h-0 flex-col">
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize={50} minSize={50}>
            <div className="h-full overflow-auto">
              <ReaderView />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50}>
            <div className="h-full overflow-auto">
              <DictionaryView />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Suspense>
  );
}
