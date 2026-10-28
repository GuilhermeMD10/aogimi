// Attribution content for the mobile app's Settings → Credits page.
// Lists only what the mobile bundle actually ships: the data sources whose
// licenses require it, the fonts, and every runtime dependency compiled into
// the app. Web-only deps (Next.js, Tailwind, Radix, shadcn, pdf.js stack, etc.)
// live in `web-frontend/aogimi-web/features/settings/lib/credits.ts` and are
// not duplicated here.
//
// Licence names are read from each package's own `license` field in
// node_modules, not recalled. When `package.json` gains or loses a runtime
// dependency, add or remove its row under "Open-source software".

export type CreditEntry = {
  name: string;
  license: string;
  owner?: string;
  url?: string;
  note?: string;
};

export type CreditSection = {
  heading: string;
  blurb?: string;
  entries: CreditEntry[];
  /** When true, the section renders always-expanded with no collapse
   *  control. Reserved for license-strict attribution that the user is
   *  required to see at a glance. */
  pinned?: boolean;
};

export const CREDITS: CreditSection[] = [
  {
    // The second paragraph of the blurb is the EDRDG's own sample
    // acknowledgement (edrdg.org/edrdg/sample.html), which its licence asks
    // an app to show on a dedicated screen — this one. Keep the wording.
    heading: 'Dictionary & language data',
    blurb:
      'Word entries, names, kanji info, JLPT levels, example sentences, and pitch-accent data shipped with this app come from the projects below, used under the terms of their licenses.\n\nThis app uses the JMdict, JMnedict and KANJIDIC2 dictionary files. These files are the property of the Electronic Dictionary Research and Development Group, and are used in conformance with the Group\'s licence.',
    pinned: true,
    entries: [
      {
        name: 'JMdict',
        license: 'CC BY-SA 4.0',
        owner: 'Electronic Dictionary Research and Development Group',
        url: 'https://www.edrdg.org/jmdict/edict_doc.html',
      },
      {
        name: 'JMnedict',
        license: 'CC BY-SA 4.0',
        owner: 'Electronic Dictionary Research and Development Group',
        url: 'https://www.edrdg.org/enamdict/enamdict_doc.html',
      },
      {
        name: 'KANJIDIC2',
        license: 'CC BY-SA 4.0',
        owner: 'Electronic Dictionary Research and Development Group',
        url: 'https://www.edrdg.org/kanjidic/kanjidic2.html',
      },
      {
        name: 'EDRDG licence',
        license: 'CC BY-SA 4.0',
        owner: 'Electronic Dictionary Research and Development Group',
        url: 'https://www.edrdg.org/edrdg/licence.html',
      },
      {
        // Waller's lists are the source; yomitan-jlpt-vocab maps them to
        // JMdict entry IDs, which is the form the app loads. Only the level
        // is kept; the lists' own glosses are not shipped.
        name: 'JLPT word lists',
        license: 'CC BY',
        owner: 'Jonathan Waller (tanos.co.uk)',
        url: 'https://www.tanos.co.uk/jlpt/',
        note: 'JLPT levels only',
      },
      {
        name: 'yomitan-jlpt-vocab',
        license: 'CC BY-SA 4.0',
        owner: 'Stephen Kraus',
        url: 'https://github.com/stephenmk/yomitan-jlpt-vocab',
        note: 'JLPT word lists mapped to JMdict entries',
      },
      {
        name: 'Kanjium — example sentences',
        license: 'CC BY-SA 4.0',
        owner: 'Kanjium project contributors',
        url: 'https://github.com/mifunetoshiro/kanjium',
      },
      {
        name: 'Kanjium — pitch accents',
        license: 'CC BY-SA 4.0',
        owner: 'Kanjium project contributors',
        url: 'https://github.com/mifunetoshiro/kanjium',
      },
    ],
  },
  {
    // Every face the bundle ships, in the role order `theme/tokens.ts` states:
    // Latin UI, Japanese, reader body. Switzer is redistributed as committed
    // `.otf` files under `assets/fonts/`, so its licence applies to us the same
    // way the Google-hosted ones do. Keep this list in sync with the `useFonts`
    // call in `app/_layout.tsx` and with `theme/switzer.ts`.
    heading: 'Typography',
    entries: [
      {
        name: 'Switzer',
        license: 'ITF Free Font License',
        owner: 'Indian Type Foundry',
        url: 'https://www.fontshare.com/fonts/switzer',
      },
      {
        name: 'Noto Sans JP',
        license: 'SIL Open Font License 1.1',
        owner: 'Google',
        url: 'https://fonts.google.com/noto/specimen/Noto+Sans+JP',
      },
      {
        name: 'Lora',
        license: 'SIL Open Font License 1.1',
        owner: 'Cyreal',
        url: 'https://fonts.google.com/specimen/Lora',
      },
      {
        // The only icon family imported (`@expo/vector-icons/Feather`), so the
        // only icon font in the bundle.
        name: 'Feather icons',
        license: 'MIT',
        owner: 'Cole Bemis',
        url: 'https://feathericons.com',
      },
    ],
  },
  {
    // zip.js and fflate are vendored inside foliate-js and inlined into
    // `features/books/reader/lib/foliateLibs.ts` by `gen-foliate-bundle`, so
    // they ship even though neither is in `package.json`. pako comes in with
    // JSZip.
    heading: 'Reader engine',
    entries: [
      { name: 'foliate-js', license: 'MIT', owner: 'John Factotum', url: 'https://github.com/johnfactotum/foliate-js' },
      { name: 'zip.js', license: 'BSD-3-Clause', owner: 'Gildas Lormeau', url: 'https://github.com/gildas-lormeau/zip.js' },
      { name: 'fflate', license: 'MIT', owner: 'Arjun Barrett', url: 'https://github.com/101arrowz/fflate' },
      {
        name: 'JSZip',
        license: 'MIT',
        owner: 'Stuart Knightley',
        url: 'https://stuk.github.io/jszip/',
        note: 'Dual-licensed MIT or GPL-3.0; used under MIT',
      },
      { name: 'pako', license: 'MIT AND Zlib', owner: 'Vitaly Puzrin and Andrei Tuputcyn', url: 'https://github.com/nodeca/pako' },
      { name: 'react-native-pdf', license: 'MIT', owner: 'Wonday', url: 'https://github.com/wonday/react-native-pdf' },
      { name: 'react-native-pdf-thumbnail', license: 'MIT', owner: 'Song Qian', url: 'https://github.com/songsterq/react-native-pdf-thumbnail' },
      { name: 'react-native-blob-util', license: 'MIT', owner: 'RonRadtke', url: 'https://github.com/RonRadtke/react-native-blob-util' },
      { name: 'react-native-awesome-gallery', license: 'MIT', owner: 'Pavel Babenko', url: 'https://github.com/pavelbabenko/react-native-awesome-gallery' },
    ],
  },
  {
    // The rest of `package.json`'s runtime dependencies. Left out on purpose:
    // `react-dom` and `react-native-web` (the web target is unused, so neither
    // reaches the iOS or Android bundle) and `expo-build-properties` (a config
    // plugin that runs at prebuild and ships no code). Skia and SQLite are
    // native libraries compiled in by react-native-skia and expo-sqlite.
    heading: 'Open-source software',
    blurb:
      'Libraries compiled into this app, with the licence each is distributed under. Each project’s page carries its full licence text and copyright notice.',
    entries: [
      { name: 'React', license: 'MIT', owner: 'Meta Platforms, Inc.', url: 'https://react.dev' },
      { name: 'React Native', license: 'MIT', owner: 'Meta Platforms, Inc.', url: 'https://reactnative.dev' },
      { name: 'Expo', license: 'MIT', owner: '650 Industries, Inc.', url: 'https://github.com/expo/expo' },
      { name: 'expo-blur', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-clipboard', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-constants', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-crypto', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-dev-client', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-document-picker', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-file-system', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-haptics', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-image', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-linear-gradient', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-linking', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-navigation-bar', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-router', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-secure-store', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-splash-screen', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-sqlite', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-status-bar', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: 'expo-system-ui', license: 'MIT', owner: '650 Industries, Inc.' },
      { name: '@expo-google-fonts/lora', license: 'MIT AND OFL-1.1', owner: 'Expo' },
      { name: '@expo-google-fonts/noto-sans-jp', license: 'MIT AND OFL-1.1', owner: 'Expo' },
      { name: '@expo/vector-icons', license: 'MIT', owner: 'Joel Arvidsson' },
      { name: '@react-native-async-storage/async-storage', license: 'MIT', url: 'https://github.com/react-native-async-storage/async-storage' },
      { name: '@react-native-community/netinfo', license: 'MIT', url: 'https://github.com/react-native-netinfo/react-native-netinfo' },
      { name: '@shopify/react-native-skia', license: 'MIT', owner: 'Shopify Inc.', url: 'https://github.com/Shopify/react-native-skia' },
      { name: 'Skia', license: 'BSD-3-Clause', owner: 'Google', url: 'https://skia.org' },
      { name: 'SQLite', license: 'Public domain', url: 'https://www.sqlite.org/copyright.html' },
      { name: 'react-native-gesture-handler', license: 'MIT', owner: 'Software Mansion', url: 'https://github.com/software-mansion/react-native-gesture-handler' },
      { name: 'react-native-reanimated', license: 'MIT', owner: 'Software Mansion', url: 'https://github.com/software-mansion/react-native-reanimated' },
      { name: 'react-native-worklets', license: 'MIT', url: 'https://github.com/software-mansion/react-native-reanimated' },
      { name: 'react-native-screens', license: 'MIT', owner: 'Software Mansion', url: 'https://github.com/software-mansion/react-native-screens' },
      { name: 'react-native-safe-area-context', license: 'MIT', owner: 'Th3rd Wave', url: 'https://github.com/AppAndFlow/react-native-safe-area-context' },
      { name: 'react-native-svg', license: 'MIT', owner: 'Horcrux', url: 'https://github.com/software-mansion/react-native-svg' },
      { name: 'react-native-webview', license: 'MIT', url: 'https://github.com/react-native-webview/react-native-webview' },
    ],
  },
];
