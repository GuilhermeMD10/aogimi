// Attribution content for the web app's Settings → Credits page. Lists
// only what the web bundle actually ships: React/Next, the Tailwind +
// Radix + shadcn UI stack, the PDF.js stack, and the data sources whose
// licenses require it. Mobile-only deps (React Native, Expo modules,
// `react-native-*` libraries) live in `mobile-frontend/aogimi-mobile/
// features/settings/lib/credits.ts` and are not duplicated here.

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
    // an app to show on a dedicated screen — this one. Keep the wording, and
    // keep it identical to mobile's.
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
        // is kept.
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
    // Everything `app/layout.tsx` actually loads — the two faces the 2026-08
    // font audition settled on. Keep this list in sync with the next/font
    // imports there.
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
    ],
  },
  {
    // zip.js and fflate are vendored inside foliate-js
    // (`public/foliate-js/vendor/`), so they ship even though neither is in
    // `package.json`; their licences are the ones foliate-js's README states.
    // pako comes in with JSZip.
    heading: 'Reader & document parsing',
    entries: [
      { name: 'foliate-js', license: 'MIT', url: 'https://github.com/johnfactotum/foliate-js' },
      { name: 'zip.js', license: 'BSD-3-Clause', owner: 'Gildas Lormeau', url: 'https://github.com/gildas-lormeau/zip.js' },
      { name: 'fflate', license: 'MIT', owner: 'Arjun Barrett', url: 'https://github.com/101arrowz/fflate' },
      { name: 'pdfjs-dist', license: 'Apache-2.0', owner: 'Mozilla', url: 'https://github.com/mozilla/pdf.js' },
      { name: 'react-pdf', license: 'MIT', url: 'https://github.com/wojtekmaj/react-pdf' },
      {
        name: 'jszip',
        license: 'MIT',
        url: 'https://stuk.github.io/jszip/',
        note: 'Dual-licensed MIT or GPL-3.0; used under MIT',
      },
      { name: 'pako', license: 'MIT AND Zlib', owner: 'Vitaly Puzrin and Andrei Tuputcyn', url: 'https://github.com/nodeca/pako' },
    ],
  },
  {
    heading: 'App frameworks',
    entries: [
      { name: 'React', license: 'MIT', url: 'https://react.dev' },
      { name: 'React DOM', license: 'MIT', url: 'https://react.dev' },
      { name: 'Next.js', license: 'MIT', url: 'https://nextjs.org' },
    ],
  },
  {
    heading: 'UI primitives & icons',
    entries: [
      { name: 'Radix UI', license: 'MIT', url: 'https://www.radix-ui.com' },
      { name: 'shadcn/ui', license: 'MIT', url: 'https://ui.shadcn.com' },
      { name: 'Lucide (lucide-react)', license: 'ISC', url: 'https://lucide.dev' },
      { name: 'Tailwind CSS', license: 'MIT', url: 'https://tailwindcss.com' },
      { name: 'tailwind-merge', license: 'MIT', url: 'https://github.com/dcastil/tailwind-merge' },
      { name: 'class-variance-authority', license: 'Apache-2.0', url: 'https://cva.style' },
      { name: 'clsx', license: 'MIT', url: 'https://github.com/lukeed/clsx' },
      { name: 'tw-animate-css', license: 'MIT', url: 'https://github.com/Wombosvideo/tw-animate-css' },
    ],
  },
  {
    heading: 'Utilities',
    entries: [
      { name: 'idb', license: 'ISC', note: 'IndexedDB wrapper' },
    ],
  },
];
