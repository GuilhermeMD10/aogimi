import Svg, { Path } from 'react-native-svg';

// Cloud-state icons for the library sync badge. Authored as web SVG (lucide
// cloud variants) and converted to react-native-svg — the RN app can't
// render raw <svg>. `currentColor` isn't a thing in RN, so callers pass an
// explicit `color`.

export type SyncIconProps = {
  size?: number;
  color?: string;
};

// Cloud (check) — book is synced to the backend.
export function SyncedIcon({ size = 24, color = '#000' }: SyncIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M17.5 12a1 1 0 1 1 0 9H9.006a7 7 0 1 1 6.702-9z" />
      <Path d="M21.832 9A3 3 0 0 0 19 7h-2.207a5.5 5.5 0 0 0-10.72.61" />
    </Svg>
  );
}

// Cloud + down alert — local-only, waiting to be pushed.
export function UnsyncedIcon({ size = 24, color = '#000' }: SyncIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 12v4" />
      <Path d="M12 20h.01" />
      <Path d="M8.128 16.949A7 7 0 1 1 15.71 8h1.79a1 1 0 0 1 0 9h-1.642" />
    </Svg>
  );
}

// Cloud + up arrow — on the account but not on this device, tap to import.
export function ImportIcon({ size = 24, color = '#000' }: SyncIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 13v8l-4-4" />
      <Path d="m12 21 4-4" />
      <Path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284" />
    </Svg>
  );
}

// Two arcing arrows — used for the global "Sync now" action button on
// the library + decks pages. Lucide's `cloud-sync` glyph.
export function CloudSyncIcon({ size = 24, color = '#000' }: SyncIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m17 18-1.535 1.605a5 5 0 0 1-8-1.5" />
      <Path d="M17 22v-4h-4" />
      <Path d="M20.996 15.251A4.5 4.5 0 0 0 17.495 8h-1.79a7 7 0 1 0-12.709 5.607" />
      <Path d="M7 10v4h4" />
      <Path d="m7 14 1.535-1.605a5 5 0 0 1 8 1.5" />
    </Svg>
  );
}
