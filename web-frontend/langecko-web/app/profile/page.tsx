'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  Settings,
  Share2,
  LogOut,
  ChevronRight,
  Camera,
  MoreHorizontal,
  X,
  Check,
  Monitor,
  Trash2,
  Info,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme, THEMES, type AppTheme } from '@/components/providers/ThemeProvider';
import { getUserProfile, updateUserProfile, type UserProfile } from '@/lib/userApi';
import { getUserBooks, type BookProgressRecord } from '@/lib/booksApi';
import { getUserDecks, type DeckRecord } from '@/lib/decksApi';
import { getUserDevices, removeDevice, renameDevice, type DeviceRecord } from '@/lib/devicesApi';
import { getDeviceId } from '@/lib/deviceId';
import OnboardingExplainerModal from '@/components/OnboardingExplainerModal';
import AvatarPickerModal, { KAMON_SET, Kamon } from '@/components/AvatarPickerModal';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

// Hardcoded preview colors so each theme card shows its own palette
const THEME_PREVIEW: Record<AppTheme, { bg: string; bgElev: string; fg: string; fgMuted: string; accent: string; border: string }> = {
  default:  { bg: '#FAFAF9', bgElev: '#FFFFFF', fg: '#1A1918', fgMuted: '#6B6966', accent: '#1A1918', border: '#E5E3DE' },
  kanagawa: { bg: '#EDE6D3', bgElev: '#F6F0DE', fg: '#0F2340', fgMuted: '#4A5E80', accent: '#1E3D6B', border: 'rgba(15,35,64,0.14)' },
  sakura:   { bg: '#FBF4F2', bgElev: '#FFFBFA', fg: '#3E2A2F', fgMuted: '#7A5A5F', accent: '#D47A8C', border: 'rgba(62,42,47,0.12)' },
  hanami:   { bg: '#14100C', bgElev: '#1E1814', fg: '#F5E9D4', fgMuted: '#B0987A', accent: '#E04B2A', border: 'rgba(245,233,212,0.14)' },
  stamp:    { bg: '#EBE2D0', bgElev: '#F0E6D2', fg: '#1A1411', fgMuted: '#3B2F26', accent: '#C8362B', border: '#1A1411' },
};

// ── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <div>
          <div className="lgc-section-label">{title}</div>
          {subtitle && <div className="mt-0.5 text-xs text-lgc-fg-muted">{subtitle}</div>}
        </div>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="text-xs text-lgc-accent hover:underline"
          >
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Field row ────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid items-center gap-4 border-t border-lgc-border py-2.5" style={{ gridTemplateColumns: '140px 1fr' }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-lgc-fg-muted">{label}</div>
      <div className="text-[13px] text-lgc-fg">{children ?? value}</div>
    </div>
  );
}

// ── Action row ───────────────────────────────────────────────────────────────

function ActionRow({
  icon: Icon,
  label,
  sub,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  sub?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md border border-lgc-border bg-lgc-bg-elev px-3 py-2.5 text-left transition-colors hover:bg-lgc-bg-sunken ${
        danger ? 'text-lgc-error' : 'text-lgc-fg'
      }`}
    >
      <Icon size={14} />
      <div className="flex-1">
        <div className="text-[13px] font-medium">{label}</div>
        {sub && <div className="text-[11px] text-lgc-fg-muted">{sub}</div>}
      </div>
      <ChevronRight size={13} className="text-lgc-fg-muted" />
    </button>
  );
}

// ── Deck cover colors (matching DeckList) ────────────────────────────────────

const DECK_COLORS = ['#6B5A45', '#2E5D4E', '#263B5C', '#8E3B36', '#4A4038', '#7A5330', '#3D5A80', '#5A3D6B'];
const DECK_KAMONS = ['\u5FC3', '\u6587', '\u9280', '\u6F22', '\u656C', '\u53E4', '\u8A00', '\u5B66', '\u66F8', '\u9053'];

function deckColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const idx = Math.abs(hash);
  return { color: DECK_COLORS[idx % DECK_COLORS.length], kamon: DECK_KAMONS[idx % DECK_KAMONS.length] };
}

// ── Profile page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<BookProgressRecord[]>([]);
  const [decks, setDecks] = useState<DeckRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editDeviceName, setEditDeviceName] = useState('');

  // Derived
  const avatarIndex = profile?.avatar_index ?? 0;
  const displayName = profile?.display_name || profile?.username || user?.username || 'User';
  const language = profile?.language || null;
  const email = profile?.email || null;
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      try {
        const [profileData, booksData, decksData, devicesData] = await Promise.allSettled([
          getUserProfile(user.id),
          getUserBooks(user.id),
          getUserDecks(user.id),
          getUserDevices(user.id),
        ]);
        if (profileData.status === 'fulfilled') setProfile(profileData.value);
        if (booksData.status === 'fulfilled') setBooks(booksData.value);
        if (decksData.status === 'fulfilled') setDecks(decksData.value);
        if (devicesData.status === 'fulfilled') setDevices(devicesData.value);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user]);

  // ── Avatar update (stored locally until DB migration runs) ─────────────────
  const handleAvatarSelect = useCallback(
    (idx: number) => {
      setProfile(prev => prev ? { ...prev, avatar_index: idx } : prev);
      // Persist to localStorage as fallback
      try { localStorage.setItem('lgc_avatar_index', String(idx)); } catch { /* ignore */ }
      // Also try backend update (will work once migration is run)
      if (user) {
        updateUserProfile(user.username, '', { avatar_index: idx }).catch(() => { /* backend not ready */ });
      }
    },
    [user],
  );

  const handleSignOut = useCallback(() => {
    logout();
    router.push('/authenticate');
  }, [logout, router]);

  const handleRemoveDevice = useCallback(
    async (deviceId: string) => {
      if (!user) return;
      try {
        await removeDevice(deviceId, user.id);
        setDevices(prev => prev.filter(d => d.device_id !== deviceId));
      } catch {
        // ignore
      }
    },
    [user],
  );

  const handleRenameDevice = useCallback(
    async (deviceId: string) => {
      if (!user || !editDeviceName.trim()) return;
      try {
        const updated = await renameDevice(deviceId, user.id, editDeviceName.trim());
        setDevices(prev => prev.map(d => d.device_id === deviceId ? { ...d, name: updated.name } : d));
        setEditingDeviceId(null);
      } catch {
        // ignore
      }
    },
    [user, editDeviceName],
  );

  // ── Currently reading ──────────────────────────────────────────────────────
  const readingBooks = books.filter(b => b.progress > 0 && b.progress < 100).slice(0, 3);
  const currentDeviceId = typeof window !== 'undefined' ? getDeviceId() : '';

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-lgc-fg-muted">Log in to view your profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-lgc-fg-muted">Loading profile&hellip;</p>
      </div>
    );
  }

  return (
    <div className="lgc-scroll min-h-full overflow-auto">
      {/* ── Hero banner ──────────────────────────────────────────────────── */}
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

      <div style={{ padding: '0 24px 22px' }}>
        {/* ── Avatar + basic info ──────────────────────────────────────────── */}
        <div className="mb-5 flex items-end gap-5" style={{ marginTop: -44 }}>
          <div className="relative">
            <Kamon char={KAMON_SET[avatarIndex]?.k ?? '波'} size={88} />
            <button
              type="button"
              onClick={() => setShowAvatarPicker(true)}
              className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-lgc-bg bg-lgc-accent text-white"
            >
              <Pencil size={11} />
            </button>
          </div>

          <div className="flex-1 pb-1.5">
            <div className="mb-1 flex items-center gap-2">
              <h1
                className="text-[22px] font-medium tracking-tight text-lgc-fg"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.015em' }}
              >
                {displayName}
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              {language && (
                <span className="lgc-chip font-semibold" style={{ background: 'var(--lgc-accent-soft)', color: 'var(--lgc-accent)' }}>
                  日本語 · {language}
                </span>
              )}
              {joinDate && (
                <span className="lgc-chip text-lgc-fg-muted">Joined {joinDate}</span>
              )}
            </div>
          </div>

          <div className="flex gap-1.5 pb-1.5">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-lgc-border px-3 py-1.5 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev"
            >
              <Share2 size={13} /> Share
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-lgc-border px-3 py-1.5 text-[13px] text-lgc-fg transition-colors hover:bg-lgc-bg-elev"
            >
              <Settings size={13} /> Settings
            </button>
          </div>
        </div>

        {/* ── Two-column layout ────────────────────────────────────────────── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '1.25fr 1fr' }}>
          {/* Left column */}
          <div>
            {/* Account section */}
            <SectionCard title="Account">
              <Field label="Display name" value={displayName} />
              <Field label="Username" value={user.username} />
              {email && <Field label="Email" value={email} />}
              <Field label="Language level">
                <div className="flex gap-1">
                  {JLPT_LEVELS.map(l => (
                    <span
                      key={l}
                      className="lgc-chip cursor-pointer"
                      style={{
                        background: language === l ? 'var(--lgc-accent)' : 'var(--lgc-bg-sunken)',
                        color: language === l ? 'white' : 'var(--lgc-fg-muted)',
                        fontWeight: language === l ? 600 : 400,
                        padding: '4px 10px',
                      }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </Field>
            </SectionCard>

            {/* Decks section */}
            <SectionCard
              title="Your decks"
              subtitle={`${decks.length} deck${decks.length !== 1 ? 's' : ''}`}
            >
              {decks.length > 0 ? (
                <div className="lgc-card overflow-hidden">
                  {decks.slice(0, 4).map((d, i, arr) => {
                    const { color, kamon } = deckColor(d.name);
                    return (
                      <div
                        key={d.id}
                        className={`flex items-center gap-3 px-3.5 py-3 ${
                          i < arr.length - 1 ? 'border-b border-lgc-border' : ''
                        }`}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg text-white/90"
                          style={{
                            background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 50%, black) 100%)`,
                            fontFamily: 'var(--font-display)',
                          }}
                        >
                          {kamon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-[13px] font-medium text-lgc-fg"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {d.name}
                          </div>
                          <div className="text-[11px] text-lgc-fg-muted">
                            {d.card_count} card{d.card_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-lgc-fg-muted">
                  No decks yet — create one in the Decks tab.
                </p>
              )}
            </SectionCard>
          </div>

          {/* Right column */}
          <div>
            {/* Currently reading */}
            <SectionCard
              title="Currently reading"
              subtitle={`${readingBooks.length} book${readingBooks.length !== 1 ? 's' : ''}`}
            >
              {readingBooks.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {readingBooks.map(b => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 rounded-lg border border-lgc-border bg-lgc-bg-elev px-3 py-2.5"
                    >
                      <div
                        className="h-10.5 w-7.5 shrink-0 rounded-sm"
                        style={{ background: b.cover_color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-[13px] font-medium text-lgc-fg"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {b.title}
                        </div>
                        <div className="mb-1 text-[11px] text-lgc-fg-muted">{b.author}</div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-0.75 flex-1 rounded-full bg-lgc-bg-sunken">
                            <div
                              className="h-full rounded-full bg-lgc-accent"
                              style={{ width: `${b.progress}%` }}
                            />
                          </div>
                          <span
                            className="text-[10px] text-lgc-fg-muted"
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            {b.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-lgc-fg-muted">
                  No books in progress.
                </p>
              )}
            </SectionCard>

            {/* Theme */}
            <SectionCard title="Theme" subtitle="Choose your visual style">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(THEMES) as AppTheme[]).map((key) => {
                  const meta = THEMES[key];
                  const p = THEME_PREVIEW[key];
                  const active = theme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTheme(key)}
                      className="overflow-hidden rounded-lg text-left transition-shadow"
                      style={{
                        border: active ? `2px solid ${p.accent}` : `1px solid ${p.border}`,
                        boxShadow: active ? `0 0 0 3px color-mix(in oklab, ${p.accent} 20%, transparent)` : 'none',
                      }}
                    >
                      {/* Mini preview bar */}
                      <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: p.bg }}>
                        <div className="h-3 w-3 rounded-full" style={{ background: p.accent }} />
                        <span className="text-[12px] font-medium" style={{ color: p.fg }}>{meta.label}</span>
                      </div>
                      {/* Hint row */}
                      <div className="px-3 py-1.5" style={{ background: p.bgElev, borderTop: `1px solid ${p.border}` }}>
                        <span className="text-[10px]" style={{ color: p.fgMuted }}>{meta.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            {/* Devices */}
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
                            onSubmit={(e) => { e.preventDefault(); handleRenameDevice(d.device_id); }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              value={editDeviceName}
                              onChange={(e) => setEditDeviceName(e.target.value)}
                              className="min-w-0 flex-1 rounded border border-lgc-border bg-lgc-bg-elev px-2 py-0.5 text-[13px] text-lgc-fg outline-none focus:border-lgc-accent"
                              autoFocus
                            />
                            <button type="submit" className="text-lgc-accent"><Check size={13} /></button>
                            <button type="button" onClick={() => setEditingDeviceId(null)} className="text-lgc-fg-muted"><X size={13} /></button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              <div
                                className="truncate text-[13px] font-medium text-lgc-fg"
                                style={{ fontFamily: 'var(--font-display)' }}
                              >
                                {d.name || 'Unnamed device'}
                              </div>
                              {d.device_id === currentDeviceId && (
                                <span className="lgc-chip text-[9px]" style={{ background: 'var(--lgc-accent-soft)', color: 'var(--lgc-accent)' }}>
                                  This device
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-lgc-fg-muted">
                              {d.book_count} book{d.book_count !== 1 ? 's' : ''} · Last seen {new Date(d.last_seen_at).toLocaleDateString()}
                            </div>
                          </>
                        )}
                      </div>
                      {editingDeviceId !== d.device_id && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditingDeviceId(d.device_id); setEditDeviceName(d.name); }}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
                          >
                            <Pencil size={12} />
                          </button>
                          {d.device_id !== currentDeviceId && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDevice(d.device_id)}
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
                <p className="py-4 text-center text-xs text-lgc-fg-muted">
                  No devices registered yet.
                </p>
              )}
            </SectionCard>

            {/* Actions */}
            <SectionCard title="Actions">
              <div className="flex flex-col gap-1.5">
                <ActionRow
                  icon={Info}
                  label="How sync works"
                  sub="Learn how your books stay local"
                  onClick={() => setShowOnboarding(true)}
                />
                <ActionRow
                  icon={Settings}
                  label="Settings"
                  sub="Preferences & notifications"
                />
                <ActionRow
                  icon={LogOut}
                  label="Sign out"
                  danger
                  onClick={handleSignOut}
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      {/* ── Avatar picker modal ────────────────────────────────────────────── */}
      {showAvatarPicker && (
        <AvatarPickerModal
          current={avatarIndex}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}

      {showOnboarding && (
        <OnboardingExplainerModal
          userId={user!.id}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
