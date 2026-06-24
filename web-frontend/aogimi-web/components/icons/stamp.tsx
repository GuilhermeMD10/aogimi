/**
 * Stamp icon set — stamp-engraving line art, 1.6px stroke, square caps,
 * 24px grid. Drawn directly from aogimi-DS/Stamp Design System.html.
 *
 * Names absent from this map fall through to the default (lucide-react)
 * set automatically. Add more icons here as the Stamp screens need them.
 */

import * as React from 'react';

import type { IconComponent, IconName, IconProps } from './types';

type SvgChildren = React.ReactNode;

function makeStampIcon(children: SvgChildren, displayName: string): IconComponent {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(function StampIcon(
    { size = 24, strokeWidth = 1.6, color, className, style, ...rest },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color ?? 'currentColor'}
        strokeWidth={strokeWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
        className={className}
        style={style}
        {...rest}
      >
        {children}
      </svg>
    );
  });
  Icon.displayName = displayName;
  return Icon as unknown as IconComponent;
}

const StampHome = makeStampIcon(
  <>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
  </>,
  'StampHome',
);

const StampReader = makeStampIcon(
  <>
    <path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" />
    <path d="M20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
  </>,
  'StampReader',
);

const StampDictionary = makeStampIcon(
  <>
    <circle cx="11" cy="11" r="6" />
    <path d="M16 16l5 5" />
    <path d="M9 11h4" />
  </>,
  'StampDictionary',
);

const StampCards = makeStampIcon(
  <>
    <rect x="4" y="4" width="16" height="16" />
    <path d="M4 9h16" />
    <path d="M9 20V9" />
  </>,
  'StampCards',
);

const StampProfile = makeStampIcon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
  </>,
  'StampProfile',
);

const StampSettings = makeStampIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
  </>,
  'StampSettings',
);

const StampSearch = makeStampIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M16.5 16.5L21 21" />
  </>,
  'StampSearch',
);

const StampAdd = makeStampIcon(
  <>
    <rect x="3" y="3" width="18" height="18" />
    <path d="M12 8v8M8 12h8" />
  </>,
  'StampAdd',
);

const StampMark = makeStampIcon(
  <path d="M6 3h12v18l-6-4-6 4z" />,
  'StampMark',
);

const StampNote = makeStampIcon(
  <>
    <path d="M9 11l-3 8 8-3z" />
    <path d="M11 9l8-7 4 4-7 8z" />
  </>,
  'StampNote',
);

const StampMail = makeStampIcon(
  <>
    <rect x="3" y="6" width="18" height="13" />
    <path d="M3 7l9 7 9-7" />
  </>,
  'StampMail',
);

const StampStamp = makeStampIcon(
  <>
    <rect x="4" y="4" width="16" height="16" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M4 4l-2-2M20 4l2-2M4 20l-2 2M20 20l2 2" />
  </>,
  'StampStamp',
);

const StampLantern = makeStampIcon(
  <>
    <path d="M8 4h8M8 20h8" />
    <path d="M7 7c0-2 2-3 5-3s5 1 5 3v10c0 2-2 3-5 3s-5-1-5-3z" />
    <path d="M7 10h10M7 14h10" />
  </>,
  'StampLantern',
);

const StampMountain = makeStampIcon(
  <path d="M3 20l6-10 4 6 3-5 5 9z" />,
  'StampMountain',
);

const StampSun = makeStampIcon(
  <circle cx="12" cy="12" r="7" fill="currentColor" stroke="none" />,
  'StampSun',
);

const StampCrest = makeStampIcon(
  <>
    <circle cx="12" cy="12" r="2" />
    <path d="M12 4v6M12 14v6M4 12h6M14 12h6" />
    <g style={{ transform: 'rotate(45deg)', transformOrigin: '12px 12px' }}>
      <path d="M12 4v6M12 14v6M4 12h6M14 12h6" />
    </g>
  </>,
  'StampCrest',
);

/**
 * Partial map: only the icons we explicitly want to override for Stamp.
 * Anything missing here is provided by `defaultIcons`.
 */
export const stampIcons: Partial<Record<IconName, IconComponent>> = {
  home: StampHome,
  reader: StampReader,
  dictionary: StampDictionary,
  cards: StampCards,
  profile: StampProfile,
  settings: StampSettings,
  search: StampSearch,
  add: StampAdd,
  plus: StampAdd,
  mark: StampMark,
  note: StampNote,
  mail: StampMail,
  stamp: StampStamp,
  lantern: StampLantern,
  mountain: StampMountain,
  sun: StampSun,
  crest: StampCrest,
};
