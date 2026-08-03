'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { PdfReaderProps } from './PdfReaderClient';

// react-pdf / pdfjs-dist touch browser-only globals (DOMMatrix, etc.) at
// module-eval time. They crash if the file is reached during Next.js's
// server render — even with `'use client'` on the consumer, because the
// theme registry pulls every reader variant into the same module graph.
// Dynamic-import with `ssr: false` keeps the entire heavy module off the
// server pass; it only loads in the browser the first time a PDF opens.
export const PdfReader = dynamic(
  () => import('./PdfReaderClient').then((m) => m.PdfReaderClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center font-[family-name:var(--face-ui)] text-[13.5px] text-(--muted)">
        Loading PDF reader…
      </div>
    ),
  },
) as ComponentType<PdfReaderProps>;
