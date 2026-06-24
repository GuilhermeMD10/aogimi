export type SelectionRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type MenuSize = { width: number; height: number };
export type Viewport = { width: number; height: number };
export type MenuPosition = { top: number; left: number; placedBelow: boolean };

const GAP = 10;
const EDGE_PAD = 8;

// Place the menu above the selection by default. If the selection's top is
// too close to the screen top to fit the menu, flip below. Horizontally,
// center on the selection and clamp to the viewport so the menu never runs
// off-screen. `placedBelow` is exposed so callers can flip a caret/arrow.
export function computeMenuPosition(
  sel: SelectionRect,
  menu: MenuSize,
  viewport: Viewport,
): MenuPosition {
  const aboveTop = sel.top - menu.height - GAP;
  const belowTop = sel.bottom + GAP;
  const fitsAbove = aboveTop >= EDGE_PAD;
  const fitsBelow = belowTop + menu.height <= viewport.height - EDGE_PAD;

  let top: number;
  let placedBelow: boolean;
  if (fitsAbove) {
    top = aboveTop;
    placedBelow = false;
  } else if (fitsBelow) {
    top = belowTop;
    placedBelow = true;
  } else {
    // Selection nearly fills the viewport. Pick whichever side has more room
    // and clamp; the menu may overlap selection but won't leave the screen.
    const roomAbove = sel.top - EDGE_PAD;
    const roomBelow = viewport.height - EDGE_PAD - sel.bottom;
    if (roomAbove >= roomBelow) {
      top = Math.max(EDGE_PAD, sel.top - menu.height - GAP);
      placedBelow = false;
    } else {
      top = Math.min(viewport.height - EDGE_PAD - menu.height, sel.bottom + GAP);
      placedBelow = true;
    }
  }

  const center = (sel.left + sel.right) / 2;
  const wantLeft = center - menu.width / 2;
  const left = Math.max(
    EDGE_PAD,
    Math.min(viewport.width - menu.width - EDGE_PAD, wantLeft),
  );

  return { top, left, placedBelow };
}
