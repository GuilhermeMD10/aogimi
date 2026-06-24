'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ActivityTab } from './ActivityTab';
import { CardsTab } from './CardsTab';

type Tab = 'activity' | 'cards';

export function StatsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('activity');

  return (
    <div className="@container flex min-h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-lgc-border px-4 py-3 @md:px-7">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="font-display text-lg text-lgc-fg">Stats</h1>
        <div className="w-12" />
      </div>

      <div className="border-b border-lgc-border px-4 pb-2 pt-3 @md:px-7">
        <div className="mx-auto flex max-w-md gap-1 rounded-full border border-lgc-border bg-lgc-bg-sunken p-1">
          <TabCell label="Activity" selected={tab === 'activity'} onClick={() => setTab('activity')} />
          <TabCell label="Cards"    selected={tab === 'cards'}    onClick={() => setTab('cards')} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'activity' ? <ActivityTab /> : <CardsTab />}
      </div>
    </div>
  );
}

function TabCell({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        selected
          ? 'border-lgc-border-strong bg-lgc-bg-elev font-semibold text-lgc-fg'
          : 'border-transparent text-lgc-fg-muted hover:text-lgc-fg'
      }`}
    >
      {label}
    </button>
  );
}
