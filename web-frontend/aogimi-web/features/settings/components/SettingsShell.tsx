import type { ReactNode } from 'react';
import { TopBar } from '@/features/app-shell/TopBar';

/**
 * The page frame all three settings routes share: TopBar with the
 * back-to-profile pill, a sticky title rail, and the panel column. /help and
 * /credits render this too, so navigating between them only appears to swap
 * the right-hand column — "Help lives inside settings" as an illusion, done
 * with routes instead of local view state.
 *
 * The rail is a fixed 236px (it holds one short title and must not grow); the
 * panel column caps at 900px because settings rows are label-left /
 * control-right, and past that the gap between the halves reads as a mistake.
 * Same 1300px column discipline as home and profile.
 */
export function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full overflow-auto font-[family-name:var(--face-ui)] font-medium">
      <div className="mx-auto w-full max-w-[1300px] px-11 pt-[34px] pb-[140px]">
        <TopBar pillEyebrow="back to profile" />

        <div className="grid items-start gap-11 lg:grid-cols-[236px_minmax(0,1fr)]">
          {/* The rail never retitles — Help and Credits are still Settings. */}
          <div className="lg:sticky lg:top-[34px]">
            <h1 className="font-[family-name:var(--face-ui)] text-[34px] leading-none font-bold text-(--ink)">
              Settings
            </h1>
          </div>

          <div className="flex max-w-[900px] flex-col gap-[34px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
