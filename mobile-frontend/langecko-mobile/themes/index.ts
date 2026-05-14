// Theme component registry — mirrors `web-frontend/.../themes/index.ts`.
//
// Each theme contributes a partial map of full-screen / large-component
// overrides. The default theme's map is empty — `useThemedComponent` falls
// through to the default implementation when its slot isn't present.
//
// Adding a themed screen:
//   1. Place the variant under `themes/<theme>/<...mirror of components path>`.
//   2. Add a slot to `ThemeComponentMap` typed against the default's prop shape.
//   3. Register it under the relevant theme below.
//   4. At the mount site, resolve via `useThemedComponent('SlotName', Default)`.

import type { ComponentType, ComponentProps } from 'react';
import type { ThemeName } from '@/theme/tokens';

import type { HomeScreen as DefaultHomeScreen } from '@/components/home/HomeScreen';
import type { DictionaryScreen as DefaultDictionaryScreen } from '@/components/dictionary/DictionaryScreen';
import type { DictEntry as DefaultDictEntry } from '@/components/dictionary/DictEntry';

import { HomeScreen as StampHomeScreen } from './stamp/home/HomeScreen';
import { DictionaryScreen as StampDictionaryScreen } from './stamp/dictionary/DictionaryScreen';
import { DictEntry as StampDictEntry } from './stamp/dictionary/DictEntry';

export type ThemeComponentMap = Partial<{
  HomeScreen: ComponentType<ComponentProps<typeof DefaultHomeScreen>>;
  DictionaryScreen: ComponentType<ComponentProps<typeof DefaultDictionaryScreen>>;
  DictEntry: ComponentType<ComponentProps<typeof DefaultDictEntry>>;
}>;

export const themeComponentRegistry: Record<ThemeName, ThemeComponentMap> = {
  default: {},
  kanagawa: {},
  sakura: {},
  hanami: {},
  stamp: {
    HomeScreen: StampHomeScreen,
    DictionaryScreen: StampDictionaryScreen,
    DictEntry: StampDictEntry,
  },
};
