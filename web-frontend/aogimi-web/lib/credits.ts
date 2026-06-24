// Attribution content for the web app's Settings → Credits page. Lists
// only what the web bundle actually ships: React/Next, the Tailwind +
// Radix + shadcn UI stack, the PDF.js stack, and the data sources whose
// licenses require it. Mobile-only deps (React Native, Expo modules,
// `react-native-*` libraries) live in `mobile-frontend/aogimi-mobile/lib/
// credits.ts` and are not duplicated here.

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
    heading: 'Dictionary & language data',
    blurb:
      'Word entries, names, kanji info, example sentences, and pitch-accent data shipped with this app come from the projects below, used under the terms of their licenses.',
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
    heading: 'Typography',
    entries: [
      {
        name: 'Lora',
        license: 'SIL Open Font License 1.1',
        owner: 'Cyreal',
        url: 'https://fonts.google.com/specimen/Lora',
      },
    ],
  },
  {
    heading: 'Reader & document parsing',
    entries: [
      { name: 'foliate-js', license: 'MIT', url: 'https://github.com/johnfactotum/foliate-js' },
      { name: 'pdfjs-dist', license: 'Apache-2.0', owner: 'Mozilla', url: 'https://github.com/mozilla/pdf.js' },
      { name: 'react-pdf', license: 'MIT', url: 'https://github.com/wojtekmaj/react-pdf' },
      { name: 'pdfreader', license: 'MIT', url: 'https://github.com/adrienjoly/npm-pdfreader' },
      { name: 'jszip', license: 'MIT', url: 'https://stuk.github.io/jszip/' },
    ],
  },
  {
    heading: 'App frameworks',
    entries: [
      { name: 'React', license: 'MIT', url: 'https://react.dev' },
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
