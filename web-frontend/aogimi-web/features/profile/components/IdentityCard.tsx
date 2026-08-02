'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button, PaperCard, PAPER_GHOST } from '@/shared/components';
import { useProfile } from '../hooks/useProfile';

/**
 * Who you are: letter avatar, display name, and the two account actions.
 *
 * The handoff's identity extras are all dropped by its own degradation rules —
 * the status chips (JLPT level, pace, currently-reading), the Japanese name
 * reading, and the milestone badge have no backing data, so the card collapses
 * to the parts that are real. "Edit profile" is display-name editing only; the
 * avatar stays the first letter of the name for now.
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
    <PaperCard className="mb-5 flex flex-wrap items-center gap-[26px] px-[30px] py-7">
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
              className="w-full max-w-[340px] rounded-(--radius-button) border border-(--paper-bd) bg-(--paper-tile) px-3.5 py-2.5 font-[family-name:var(--face-ui)] text-[20px] font-bold text-(--ink) outline-none focus:border-(--btn)"
            />
            <Button onClick={() => void save()} className="px-4 py-[11px] text-[13.5px]">
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <button type="button" onClick={cancel} className={PAPER_GHOST}>
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
          <button type="button" onClick={startEditing} className={PAPER_GHOST}>
            Edit profile
          </button>
          <Button href="/settings" icon={<Settings size={15} />} className="px-4 py-[11px] text-[13.5px]">
            Settings
          </Button>
        </div>
      )}
    </PaperCard>
  );
}
