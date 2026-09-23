// Barrel for `features/books/reader/components`: import several of its modules from one place.
// Files inside this folder import their siblings by path, never through here.
//
// `PdfReaderClient` is deliberately absent: `PdfReader` loads it with `next/dynamic` (`ssr: false`)
// because pdf.js touches browser globals at module-eval time. Re-exporting it here would put it
// back on the server pass. Import its types by file path.

export * from './ContentsPanel';
export * from './DictPanelHeader';
export * from './EpubReader';
export * from './PdfReader';
export * from './ReaderShell';
export * from './SettingsPanel';
