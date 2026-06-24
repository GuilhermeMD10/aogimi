// Theme component registry.
//
// `AppTheme` is derived from `THEMES` (in `ThemeProvider`), so the registry's
// keys are kept in sync with the source of truth at compile time — drop a
// theme into `THEMES` and TypeScript forces you to add a registry entry here
// (and vice versa).
//
// Each theme contributes a partial map of *whole-screen* component overrides.
// Smaller theme variations (border/shadow/radius/font/color shifts on a chip
// or button) belong in shape tokens, not here — see `THEMES.md` for the
// dispatch decision rule.
//
// Adding a themed screen:
//   1. Place the variant under `themes/<theme>/<...mirror of components path>`.
//   2. Add a slot to `ThemeComponentMap` typed against the default's prop shape.
//   3. Register it under the relevant theme below.
//   4. In the default component's folder, add an `index.tsx` resolver
//      (see `components/DeepLTranslationPopup/index.tsx` for the pattern).

import type { ComponentType, ComponentProps, ForwardRefExoticComponent, RefAttributes } from 'react';
import type { AppTheme } from '@/components/providers/ThemeProvider';

import type { TypographyPanel as DefaultTypographyPanel } from '@/components/reader/TypographyPanel/TypographyPanel';
import type { TextContextMenu as DefaultTextContextMenu } from '@/components/reader/TextContextMenu/TextContextMenu';
import type DefaultProfileBubble from '@/components/page-bubbles/ProfileBubble/ProfileBubble';
import type { MangaReader as DefaultMangaReader } from '@/components/reader/MangaReader/MangaReader';
import type { TextReader as DefaultTextReader } from '@/components/reader/TextReader/TextReader';
import type DefaultReaderView from '@/components/views/ReaderView/ReaderView';
import type DefaultOnboardingExplainer from '@/components/onboarding/OnboardingExplainer/OnboardingExplainer';
import type DefaultHomeView from '@/components/home/HomeView/HomeView';
import type DefaultReaderBubble from '@/components/page-bubbles/ReaderBubble/ReaderBubble';
import type { DefaultReaderProgressBar } from '@/components/reader/ReaderProgressBar.default';
import type { DefaultWorkspaceNav } from '@/components/WorkspaceNav.default';

import { TypographyPanel as StampTypographyPanel } from './stamp/reader/TypographyPanel';
import { TextContextMenu as StampTextContextMenu } from './stamp/reader/TextContextMenu';
import StampProfileBubble from './stamp/page-bubbles/ProfileBubble';
import { MangaReader as StampMangaReader } from './stamp/reader/MangaReader';
import { TextReader as StampTextReader } from './stamp/reader/TextReader';
import StampReaderView from './stamp/views/ReaderView';
import StampOnboardingExplainer from './stamp/onboarding/OnboardingExplainer';
import StampHomeView from './stamp/home/HomeView';
import StampReaderBubble from './stamp/page-bubbles/ReaderBubble';
import { StampReaderProgressBar } from './stamp/reader/ReaderProgressBar';
import { StampWorkspaceNav } from './stamp/components/WorkspaceNav';

export type ThemeComponentMap = Partial<{
  TypographyPanel: ComponentType<ComponentProps<typeof DefaultTypographyPanel>>;
  TextContextMenu: ForwardRefExoticComponent<ComponentProps<typeof DefaultTextContextMenu> & RefAttributes<HTMLDivElement>>;
  ProfileBubble: ComponentType<ComponentProps<typeof DefaultProfileBubble>>;
  MangaReader: ComponentType<ComponentProps<typeof DefaultMangaReader>>;
  TextReader: ComponentType<ComponentProps<typeof DefaultTextReader>>;
  ReaderView: ComponentType<ComponentProps<typeof DefaultReaderView>>;
  OnboardingExplainer: ComponentType<ComponentProps<typeof DefaultOnboardingExplainer>>;
  HomeView: ComponentType<ComponentProps<typeof DefaultHomeView>>;
  ReaderBubble: ComponentType<ComponentProps<typeof DefaultReaderBubble>>;
  ReaderProgressBar: ComponentType<ComponentProps<typeof DefaultReaderProgressBar>>;
  WorkspaceNav: ComponentType<ComponentProps<typeof DefaultWorkspaceNav>>;
}>;

export const themeComponentRegistry: Record<AppTheme, ThemeComponentMap> = {
  default: {},
  kanagawa: {},
  sakura: {},
  hanami: {},
  stamp: {
    TypographyPanel: StampTypographyPanel,
    TextContextMenu: StampTextContextMenu,
    ProfileBubble: StampProfileBubble,
    MangaReader: StampMangaReader,
    TextReader: StampTextReader,
    ReaderView: StampReaderView,
    OnboardingExplainer: StampOnboardingExplainer,
    HomeView: StampHomeView,
    ReaderBubble: StampReaderBubble,
    ReaderProgressBar: StampReaderProgressBar,
    WorkspaceNav: StampWorkspaceNav,
  },
};
