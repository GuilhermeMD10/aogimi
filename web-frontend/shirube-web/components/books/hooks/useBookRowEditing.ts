'use client';

import { useState } from 'react';
import type { Book } from '../types';

/**
 * Shared editing/menu state for a single book row tile. HeroBookRow and
 * BookTile both surfaced the exact same trio of useStates + startEdit /
 * commitEdit / cancelEdit handlers; this hook is their common host.
 */
export function useBookRowEditing(
  book: Book,
  onRename: (title: string) => void,
) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(book.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const startEdit = () => {
    setDraft(book.title);
    setEditing(true);
    setMenuOpen(false);
  };
  const commitEdit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== book.title) onRename(trimmed);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft(book.title);
  };

  return {
    editing,
    draft,
    setDraft,
    menuOpen,
    setMenuOpen,
    startEdit,
    commitEdit,
    cancelEdit,
  };
}
