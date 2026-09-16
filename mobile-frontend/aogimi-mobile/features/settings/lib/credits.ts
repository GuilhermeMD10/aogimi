// Attribution content for the mobile app's Settings → Credits page.
// Lists only what the mobile bundle actually ships: native frameworks,
// the RN-specific packages, and the data sources whose licenses require
// it. Web-only deps (Next.js, Tailwind, Radix, shadcn, pdf.js stack, etc.)
// live in `web-frontend/aogimi-web/lib/credits.ts` and are not duplicated
// here.

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
    ],
  },
  {
    heading: 'Reader engine',
    entries: [
      { name: 'foliate-js', license: 'MIT', url: 'https://github.com/johnfactotum/foliate-js' },
    ],
  },
];
