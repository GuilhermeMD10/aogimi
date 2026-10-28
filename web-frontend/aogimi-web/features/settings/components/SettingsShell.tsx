import type { ReactNode } from 'react';

/**
 * The page frame all the settings routes share: a sticky title rail and
 * the panel column (the way back to /profile is the nav's avatar). /help,
 * /credits and /privacy render this too, so navigating between them only
 * appears to swap the right-hand column — "Help lives inside settings" as an
 * illusion, done with routes instead of local view state.
 *
 * The rail is a fixed 236px (it holds one short title and must not grow); the
 * panel column caps at 900px because settings rows are label-left /
 * control-right, and past that the gap between the halves reads as a mistake.
 * Same 1300px column discipline as home and profile.
 */
export function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full overflow-auto font-[family-name:var(--face-ui)] font-medium">
      {/* The narrow gutter is for /privacy, the one route a phone can open. */}
      <div className="mx-auto w-full max-w-[1300px] px-4 pt-[34px] sm:px-11">

        <div className="grid items-start gap-11 lg:grid-cols-[236px_minmax(0,1fr)]">
          {/* The rail never retitles — Help, Credits and Privacy are still Settings. */}
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
