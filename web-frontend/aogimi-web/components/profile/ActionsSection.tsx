'use client';

import { Info, LogOut, Settings } from 'lucide-react';
import { SectionCard } from '@/shared/ui/SectionCard';
import { ActionRow } from '@/shared/ui/ActionRow';

export function ActionsSection({
  onShowOnboarding,
  onSignOut,
}: {
  onShowOnboarding: () => void;
  onSignOut: () => void;
}) {
  return (
    <SectionCard title="Actions">
      <div className="flex flex-col gap-1.5">
        <ActionRow
          icon={Info}
          label="How sync works"
          sub="Learn how your books stay local"
          onClick={onShowOnboarding}
        />
        <ActionRow icon={Settings} label="Settings" sub="Preferences & notifications" />
        <ActionRow icon={LogOut} label="Sign out" danger onClick={onSignOut} />
      </div>
    </SectionCard>
  );
}
