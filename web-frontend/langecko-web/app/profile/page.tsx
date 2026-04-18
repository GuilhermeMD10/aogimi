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
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme, THEMES, type AppTheme } from '@/components/providers/ThemeProvider';
import { getUserProfile, updateUserProfile, type UserProfile, type ProfileUpdate } from '@/lib/userApi';
import { getUserBooks, type UserBookRecord } from '@/lib/booksApi';
import { getUserDecks, type DeckRecord } from '@/lib/decksApi';

// ── Kamon set ────────────────────────────────────────────────────────────────

const KAMON_SET = [
  { k: '波', label: 'nami · wave' },
  { k: '桜', label: 'sakura · blossom' },
  { k: '月', label: 'tsuki · moon' },
  { k: '龍', label: 'ryū · dragon' },
  { k: '虎', label: 'tora · tiger' },
  { k: '鶴', label: 'tsuru · crane' },
  { k: '梅', label: 'ume · plum' },
  { k: '竹', label: 'take · bamboo' },
  { k: '松', label: 'matsu · pine' },
  { k: '山', label: 'yama · mountain' },
  { k: '川', label: 'kawa · river' },
  { k: '風', label: 'kaze · wind' },
  { k: '火', label: 'hi · fire' },
  { k: '星', label: 'hoshi · star' },
  { k: '雷', label: 'kaminari · thunder' },
  { k: '狐', label: 'kitsune · fox' },
];

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

// Hardcoded preview colors so each theme card shows its own palette
const THEME_PREVIEW: Record<AppTheme, { bg: string; bgElev: string; fg: string; fgMuted: string; accent: string; border: string }> = {
  default:  { bg: '#FAFAF9', bgElev: '#FFFFFF', fg: '#1A1918', fgMuted: '#6B6966', accent: '#1A1918', border: '#E5E3DE' },
  kanagawa: { bg: '#EDE6D3', bgElev: '#F6F0DE', fg: '#0F2340', fgMuted: '#4A5E80', accent: '#1E3D6B', border: 'rgba(15,35,64,0.14)' },
  sakura:   { bg: '#FBF4F2', bgElev: '#FFFBFA', fg: '#3E2A2F', fgMuted: '#7A5A5F', accent: '#D47A8C', border: 'rgba(62,42,47,0.12)' },
  hanami:   { bg: '#14100C', bgElev: '#1E1814', fg: '#F5E9D4', fgMuted: '#B0987A', accent: '#E04B2A', border: 'rgba(245,233,212,0.14)' },
};

// ── Kamon avatar component ───────────────────────────────────────────────────

function Kamon({
  char,
  size = 48,
  active,
  onClick,
}: {
  char: string;
  size?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative flex shrink-0 items-center justify-center rounded-full ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={{
        width: size,
        height: size,
        background: 'var(--lgc-bg-elev)',
        border: active ? '2px solid var(--lgc-accent)' : '1px solid var(--lgc-border)',
        boxShadow: active ? '0 0 0 3px color-mix(in oklab, var(--lgc-accent) 25%, transparent)' : 'none',
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          inset: 4,
          border: '1px dashed color-mix(in oklab, currentColor 12%, transparent)',
        }}
      />
      <div
        className="text-lgc-fg"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: size * 0.5,
          lineHeight: 1,
        }}
      >
        {char}
      </div>
    </div>
  );
}

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

// ── Avatar picker modal ──────────────────────────────────────────────────────

function AvatarPickerModal({
  current,
  onSelect,
  onClose,
}: {
  current: number;
  onSelect: (idx: number) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(current);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-140 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-lgc-border-strong bg-lgc-bg-elev shadow-2xl">
        {/* Header */}
        <div className="flex items-center border-b border-lgc-border px-5 py-4">
          <div>
            <div className="lgc-section-label">Choose avatar</div>
            <div className="mt-0.5 text-sm font-medium text-lgc-fg">
              Kamon — traditional family crest monograms
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
          >
            <X size={14} />
          </button>
        </div>

        {/* Grid */}
        <div className="px-5 py-5">
          <div className="mb-3.5 text-[11px] text-lgc-fg-muted">
            16 kamon options — select one to represent your profile.
          </div>
          <div className="grid grid-cols-8 gap-2.5">
            {KAMON_SET.map((k, i) => (
              <div key={k.k} className="flex flex-col items-center gap-1">
                <Kamon char={k.k} size={52} active={selected === i} onClick={() => setSelected(i)} />
                <div
                  className="text-center text-[9px] leading-tight text-lgc-fg-muted"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {k.k}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-lgc-bg-sunken px-3 py-2.5 text-xs text-lgc-fg-muted">
            <Lightbulb size={14} className="shrink-0" />
            <span>Custom upload coming when social features ship.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-lgc-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-lgc-border px-3 py-1.5 text-sm text-lgc-fg transition-colors hover:bg-lgc-bg-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onSelect(selected); onClose(); }}
            className="flex items-center gap-1.5 rounded-md bg-lgc-accent px-4 py-1.5 text-sm font-medium text-lgc-accent-fg transition-opacity hover:opacity-90"
          >
            <Check size={13} /> Save
          </button>
        </div>
      </div>
    </>
  );
}

// ── Profile page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<UserBookRecord[]>([]);
  const [decks, setDecks] = useState<DeckRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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
        const [profileData, booksData, decksData] = await Promise.allSettled([
          getUserProfile(user.id),
          getUserBooks(user.id),
          getUserDecks(user.id),
        ]);
        if (profileData.status === 'fulfilled') setProfile(profileData.value);
        if (booksData.status === 'fulfilled') setBooks(booksData.value);
        if (decksData.status === 'fulfilled') setDecks(decksData.value);
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
    router.push('/');
  }, [logout, router]);

  // ── Currently reading ──────────────────────────────────────────────────────
  const readingBooks = books.filter(b => b.progress > 0 && b.progress < 100).slice(0, 3);

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
          height: 160,
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

      <div className="mx-auto max-w-270 px-10">
        {/* ── Avatar + basic info ──────────────────────────────────────────── */}
        <div className="mb-5 flex items-end gap-5" style={{ marginTop: -54 }}>
          <div className="relative">
            <Kamon char={KAMON_SET[avatarIndex]?.k ?? '波'} size={108} />
            <button
              type="button"
              onClick={() => setShowAvatarPicker(true)}
              className="absolute bottom-1 right-1 flex h-7.5 w-7.5 items-center justify-center rounded-full border-2 border-lgc-bg bg-lgc-accent text-white"
            >
              <Pencil size={13} />
            </button>
          </div>

          <div className="flex-1 pb-1.5">
            <div className="mb-1 flex items-center gap-2">
              <h1
                className="text-[28px] font-medium tracking-tight text-lgc-fg"
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
        <div className="grid gap-5 pb-10" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
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
              actionLabel="Manage"
              onAction={() => router.push('/cards')}
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

            {/* Actions */}
            <SectionCard title="Actions">
              <div className="flex flex-col gap-1.5">
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
    </div>
  );
}
