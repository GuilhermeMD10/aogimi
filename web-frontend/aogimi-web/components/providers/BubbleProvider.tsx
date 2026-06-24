'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { BubbleKey } from '@/components/WorkspaceNav';

type BubbleCtx = {
  activeBubble: BubbleKey | null;
  setActiveBubble: (key: BubbleKey | null) => void;
  toggleBubble: (key: BubbleKey) => void;
};

const Ctx = createContext<BubbleCtx | null>(null);

export function BubbleProvider({ children }: { children: React.ReactNode }) {
  const [activeBubble, setActiveBubble] = useState<BubbleKey | null>(null);

  const toggleBubble = useCallback((key: BubbleKey) => {
    setActiveBubble((prev) => (prev === key ? null : key));
  }, []);

  return (
    <Ctx.Provider value={{ activeBubble, setActiveBubble, toggleBubble }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBubble(): BubbleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBubble must be used inside BubbleProvider');
  return ctx;
}
