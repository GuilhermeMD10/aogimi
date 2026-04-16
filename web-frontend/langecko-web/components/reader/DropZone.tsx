'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

type Props = {
  /** Native <input accept> string, e.g. ".epub,application/epub+zip" */
  accept: string;
  /** Return an error string if invalid, null if ok. */
  validate: (file: File) => string | null;
  currentFilename: string | null;
  /** Shown as a hint when no file is open ("Last opened: …"). */
  lastFilename?: string | null;
  onFile: (file: File) => void;
};

export function DropZone({ accept, validate, currentFilename, lastFilename, onFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const process = (file: File) => {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError(null);
    onFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) process(file);
    e.target.value = '';
  };

  const hint =
    currentFilename ??
    (lastFilename ? `Last: ${lastFilename}` : 'Open or drop file…');

  return (
    <div className="flex flex-col gap-1">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer select-none items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors ${
          dragging
            ? 'border-lumina-primary-teal bg-lumina-primary-teal/5 text-lumina-primary-teal'
            : currentFilename
              ? 'border-lumina-border-divider text-lumina-primary-text hover:bg-lumina-primary-text/5'
              : 'border-dashed border-lumina-border-divider text-lumina-secondary-text hover:bg-lumina-primary-text/5'
        }`}
      >
        <span className="shrink-0 text-base leading-none">
          {currentFilename ? '◈' : '↑'}
        </span>
        <span className="max-w-48 truncate">{hint}</span>
      </div>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}

      <input ref={inputRef} type="file" accept={accept} onChange={onChange} className="hidden" />
    </div>
  );
}
