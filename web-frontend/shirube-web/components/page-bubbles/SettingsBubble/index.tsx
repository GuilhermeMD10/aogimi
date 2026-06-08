'use client';

// No theme dispatch yet — there's only one variant. When we add a Stamp
// version, follow ProfileBubble/index.tsx's `useThemedComponent` pattern
// and register the key in `themes/index.ts`.
export { default } from './SettingsBubble';
export type { SettingsBubbleProps } from './SettingsBubble';
