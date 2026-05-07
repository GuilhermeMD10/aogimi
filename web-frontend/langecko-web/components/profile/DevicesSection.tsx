'use client';

import { useState } from 'react';
import { Check, Monitor, Pencil, Trash2, X } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import type { DeviceRecord } from '@/lib/devicesApi';

export function DevicesSection({
  devices,
  currentDeviceId,
  onRename,
  onRemove,
}: {
  devices: DeviceRecord[];
  currentDeviceId: string;
  onRename: (deviceId: string, name: string) => Promise<void> | void;
  onRemove: (deviceId: string) => Promise<void> | void;
}) {
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const submitRename = async (deviceId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await onRename(deviceId, trimmed);
    setEditingDeviceId(null);
  };

  return (
    <SectionCard
      title="Your devices"
      subtitle={`${devices.length} device${devices.length !== 1 ? 's' : ''}`}
    >
      {devices.length > 0 ? (
        <div className="lgc-card overflow-hidden">
          {devices.map((d, i, arr) => (
            <div
              key={d.device_id}
              className={`flex items-center gap-3 px-3.5 py-3 ${
                i < arr.length - 1 ? 'border-b border-lgc-border' : ''
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lgc-bg-sunken">
                <Monitor size={14} className="text-lgc-fg-muted" />
              </div>
              <div className="min-w-0 flex-1">
                {editingDeviceId === d.device_id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submitRename(d.device_id);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="min-w-0 flex-1 rounded border border-lgc-border bg-lgc-bg-elev px-2 py-0.5 text-[13px] text-lgc-fg outline-none focus:border-lgc-accent"
                      autoFocus
                    />
                    <button type="submit" className="text-lgc-accent">
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDeviceId(null)}
                      className="text-lgc-fg-muted"
                    >
                      <X size={13} />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="truncate text-[13px] font-medium text-lgc-fg font-display"
                      >
                        {d.name || 'Unnamed device'}
                      </div>
                      {d.device_id === currentDeviceId && (
                        <span
                          className="lgc-chip text-[9px]"
                          style={{ background: 'var(--lgc-accent-soft)', color: 'var(--lgc-accent)' }}
                        >
                          This device
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-lgc-fg-muted">
                      {d.book_count} book{d.book_count !== 1 ? 's' : ''} · Last seen{' '}
                      {new Date(d.last_seen_at).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>
              {editingDeviceId !== d.device_id && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDeviceId(d.device_id);
                      setEditName(d.name);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
                  >
                    <Pencil size={12} />
                  </button>
                  {d.device_id !== currentDeviceId && (
                    <button
                      type="button"
                      onClick={() => void onRemove(d.device_id)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-lgc-fg-muted">No devices registered yet.</p>
      )}
    </SectionCard>
  );
}
