'use client';

import { Camera } from 'lucide-react';

/** Gradient cover banner with diagonal hatch overlay + an "Edit cover" button. */
export function HeroBanner() {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: 108,
        background: 'linear-gradient(135deg, #1A1918 0%, #3A342C 100%)',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.12,
          background: 'repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.08) 12px 13px)',
        }}
      />
      <button
        type="button"
        className="absolute right-4.5 top-3.5 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white/90 transition-colors"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      >
        <Camera size={13} /> Edit cover
      </button>
    </div>
  );
}
