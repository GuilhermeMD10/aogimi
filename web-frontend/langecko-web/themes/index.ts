// Theme component registry.
//
// Each theme (`AppTheme` from `ThemeProvider`) contributes a partial map of
// component overrides. The default theme's map is empty — the resolver inside
// each component's `index.tsx` falls through to the default implementation
// when its slot isn't present.
//
// Adding a themed component:
//   1. Place the variant under `themes/<theme>/<...mirror of components path>`.
//   2. Add a slot to `ThemeComponentMap` typed against the default's prop shape.
//   3. Register it under the relevant theme below.
//   4. In the default component's folder, add an `index.tsx` resolver
//      (see `components/DeepLTranslationPopup/index.tsx` for the pattern).

import type { ComponentType, ComponentProps, ForwardRefExoticComponent, RefAttributes } from 'react';
import type { AppTheme } from '@/components/providers/ThemeProvider';

import type { DeepLTranslationPopup as DefaultDeepL } from '@/components/DeepLTranslationPopup/DeepLTranslationPopup';
import type DefaultWordDetail from '@/components/views/WordDetailView/WordDetailView';
import type { TypographyPanel as DefaultTypographyPanel } from '@/components/reader/TypographyPanel/TypographyPanel';
import type { TextContextMenu as DefaultTextContextMenu } from '@/components/reader/TextContextMenu/TextContextMenu';
import type DefaultProfileBubble from '@/components/page-bubbles/ProfileBubble/ProfileBubble';
import type { PendingCardOverlay as DefaultPendingCardOverlay } from '@/components/views/cards/PendingCardOverlay/PendingCardOverlay';
import type { MangaReader as DefaultMangaReader } from '@/components/reader/MangaReader/MangaReader';
import type { StudyView as DefaultStudyView } from '@/components/views/cards/StudyView/StudyView';
import type { TextReader as DefaultTextReader } from '@/components/reader/TextReader/TextReader';
import type DefaultDictionaryView from '@/components/views/DictionaryView/DictionaryView';
import type DefaultReaderView from '@/components/views/ReaderView/ReaderView';
import type DefaultOnboardingExplainer from '@/components/onboarding/OnboardingExplainer/OnboardingExplainer';
import type DefaultHomeView from '@/components/home/HomeView/HomeView';
import type DefaultReaderBubble from '@/components/page-bubbles/ReaderBubble/ReaderBubble';
import type DefaultAvatarPickerModal from '@/components/AvatarPickerModal/AvatarPickerModal';
import type DefaultOnboardingExplainerModal from '@/components/OnboardingExplainerModal/OnboardingExplainerModal';

import { DeepLTranslationPopup as StampDeepL } from './stamp/components/DeepLTranslationPopup';
import StampWordDetail from './stamp/views/WordDetailView';
import { TypographyPanel as StampTypographyPanel } from './stamp/reader/TypographyPanel';
import { TextContextMenu as StampTextContextMenu } from './stamp/reader/TextContextMenu';
import StampProfileBubble from './stamp/page-bubbles/ProfileBubble';
import { PendingCardOverlay as StampPendingCardOverlay } from './stamp/views/cards/PendingCardOverlay';
import { MangaReader as StampMangaReader } from './stamp/reader/MangaReader';
import { StudyView as StampStudyView } from './stamp/views/cards/StudyView';
import { TextReader as StampTextReader } from './stamp/reader/TextReader';
import StampDictionaryView from './stamp/views/DictionaryView';
import StampReaderView from './stamp/views/ReaderView';
import StampOnboardingExplainer from './stamp/onboarding/OnboardingExplainer';
import StampHomeView from './stamp/home/HomeView';
import StampReaderBubble from './stamp/page-bubbles/ReaderBubble';
import StampAvatarPickerModal from './stamp/components/AvatarPickerModal';
import StampOnboardingExplainerModal from './stamp/components/OnboardingExplainerModal';

export type ThemeComponentMap = Partial<{
  DeepLTranslationPopup: ComponentType<ComponentProps<typeof DefaultDeepL>>;
  WordDetailView: ComponentType<ComponentProps<typeof DefaultWordDetail>>;
  TypographyPanel: ComponentType<ComponentProps<typeof DefaultTypographyPanel>>;
  TextContextMenu: ForwardRefExoticComponent<ComponentProps<typeof DefaultTextContextMenu> & RefAttributes<HTMLDivElement>>;
  ProfileBubble: ComponentType<ComponentProps<typeof DefaultProfileBubble>>;
  PendingCardOverlay: ComponentType<ComponentProps<typeof DefaultPendingCardOverlay>>;
  MangaReader: ComponentType<ComponentProps<typeof DefaultMangaReader>>;
  StudyView: ComponentType<ComponentProps<typeof DefaultStudyView>>;
  TextReader: ComponentType<ComponentProps<typeof DefaultTextReader>>;
  DictionaryView: ComponentType<ComponentProps<typeof DefaultDictionaryView>>;
  ReaderView: ComponentType<ComponentProps<typeof DefaultReaderView>>;
  OnboardingExplainer: ComponentType<ComponentProps<typeof DefaultOnboardingExplainer>>;
  HomeView: ComponentType<ComponentProps<typeof DefaultHomeView>>;
  ReaderBubble: ComponentType<ComponentProps<typeof DefaultReaderBubble>>;
  AvatarPickerModal: ComponentType<ComponentProps<typeof DefaultAvatarPickerModal>>;
  OnboardingExplainerModal: ComponentType<ComponentProps<typeof DefaultOnboardingExplainerModal>>;
}>;

export const themeComponentRegistry: Record<AppTheme, ThemeComponentMap> = {
  default: {},
  kanagawa: {},
  sakura: {},
  hanami: {},
  stamp: {
    DeepLTranslationPopup: StampDeepL,
    WordDetailView: StampWordDetail,
    TypographyPanel: StampTypographyPanel,
    TextContextMenu: StampTextContextMenu,
    ProfileBubble: StampProfileBubble,
    PendingCardOverlay: StampPendingCardOverlay,
    MangaReader: StampMangaReader,
    StudyView: StampStudyView,
    TextReader: StampTextReader,
    DictionaryView: StampDictionaryView,
    ReaderView: StampReaderView,
    OnboardingExplainer: StampOnboardingExplainer,
    HomeView: StampHomeView,
    ReaderBubble: StampReaderBubble,
    AvatarPickerModal: StampAvatarPickerModal,
    OnboardingExplainerModal: StampOnboardingExplainerModal,
  },
};
