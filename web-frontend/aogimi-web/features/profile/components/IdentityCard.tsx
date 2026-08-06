'use client';

import { useState } from 'react';
import { GLASS_GHOST, GLASS_SURFACE, GlassCard } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { useProfile } from '../hooks/useProfile';

/**
 * Who you are: letter avatar, display name, and the two account actions.
 *
 * The handoff's identity extras are all dropped by its own degradation rules —
 * the status chips (JLPT level, pace, currently-reading), the Japanese name
 * reading, and the milestone badge have no backing data, so the card collapses
 * to the parts that are real. "Edit profile" is display-name editing only; the
 * avatar stays the first letter of the name for now.
 *
 * Glass throughout, like every card on this page: `GlassCard` for the shell,
 * `GLASS_GHOST` for all four actions, and the rename field is a `GLASS_SURFACE`
 * (the dictionary's search field made the same call — a pane, not a control, so
 * no hover). The filled `--btn` `Button` that used to carry Save and Settings is
 * gone from this page: the library has one glass button treatment for its import,
 * resume and re-add alike, and a page with one material wants one button. The
 * ink is what still separates an action from a secondary one — `--ink` for Save,
 * Edit profile and Settings, `--soft` for Cancel.
 */
export function IdentityCard() {
  const { displayName, saveDisplayName } = useProfile();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(displayName);
    setSaveError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setSaveError(null);
  };

  const save = async () => {
    const name = draft.trim();
    if (!name || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveDisplayName(name);
      setEditing(false);
    } catch {
      // Keep the editor open so the draft isn't lost.
      setSaveError('Could not save — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="mb-5 flex flex-wrap items-center gap-[26px] px-[30px] py-7">
      <span
        aria-hidden
        className="flex size-[92px] shrink-0 items-center justify-center rounded-full bg-(--avatar) font-[family-name:var(--face-ui)] text-[38px] font-bold text-(--avatar-ink)"
      >
        {displayName.charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save();
                if (e.key === 'Escape') cancel();
              }}
              maxLength={64}
              aria-label="Display name"
              // Fill, blur, edge and inner glow all land; the specular top line
              // doesn't, because `<input>` is a replaced element and browsers
              // don't render `::before` on one. Nothing to chase — the field
              // reads as glass without it, and the dictionary's version paints
              // the line only because its shell is a `<form>`.
              className={cn(
                GLASS_SURFACE,
                'w-full max-w-[340px] rounded-(--radius-button) px-3.5 py-2.5',
                'font-[family-name:var(--face-ui)] text-[20px] font-bold text-(--ink)',
                'outline-none focus:border-(--btn)',
              )}
            />
            <button type="button" onClick={() => void save()} className={cn(GLASS_GHOST, 'text-(--ink)')}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={cancel} className={cn(GLASS_GHOST, 'text-(--soft)')}>
              Cancel
            </button>
            {saveError && (
              <p className="w-full font-[family-name:var(--face-ui)] text-[12.5px] text-(--danger)">
                {saveError}
              </p>
            )}
          </div>
        ) : (
          <h1 className="truncate font-[family-name:var(--face-ui)] text-[38px] leading-none font-bold text-(--ink)">
            {displayName}
          </h1>
        )}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-[11px]">
          <button type="button" onClick={startEditing} className={cn(GLASS_GHOST, 'text-(--ink)')}>
            Edit profile
          </button>
          {/* The Settings link that used to sit here is gone with the /settings
              route — the settings list is a column of this same page now. */}
        </div>
      )}
    </GlassCard>
  );
}
