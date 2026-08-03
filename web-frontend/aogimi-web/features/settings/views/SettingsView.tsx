import { Eyebrow } from '@/shared/components';
import { AboutCard } from '../components/AboutCard';
import { AppearanceCard } from '../components/AppearanceCard';
import { DataCard } from '../components/DataCard';
import { SettingsShell } from '../components/SettingsShell';
import { SkyHueCard } from '../components/SkyHueCard';

/**
 * `/settings` — deliberately small: two writable controls (theme, sky hue —
 * separate axes, hence separate cards) and the account actions, with Help and
 * Credits linked from the About card. Anything inferable from behaviour is not a
 * setting. Reached from the Settings button on /profile; renders from local
 * state immediately — never a spinner on a preferences screen.
 */
export default function SettingsView() {
  return (
    <SettingsShell>
      <div>
        <Eyebrow className="mb-3">Appearance</Eyebrow>
        <div className="flex flex-col gap-3">
          <AppearanceCard />
          <SkyHueCard />
        </div>
      </div>
      <div>
        <Eyebrow className="mb-3">About</Eyebrow>
        <AboutCard />
      </div>
      <div>
        <Eyebrow className="mb-3">Data</Eyebrow>
        <DataCard />
      </div>
    </SettingsShell>
  );
}
