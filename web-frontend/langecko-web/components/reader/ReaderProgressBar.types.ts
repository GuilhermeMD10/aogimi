/**
 * Props shared by every theme variant of `ReaderProgressBar`. Each variant
 * lives in `components/theme-decorations/<theme>/ReaderProgressBar.tsx` and
 * imports this type to stay in sync with the public API.
 */
export type ReaderProgressBarProps = {
  /** Filled fraction, 0–100. */
  fraction: number;
  /** Right-to-left layout (manga / vertical Japanese). */
  rtl?: boolean;
  /**
   * Layout classes for the outer wrapper — width, flex, max-width, etc.
   * For the default variant this also controls height (e.g. `h-1`); the
   * stamp variant pins the height at 8px so the hatch overlay reads.
   */
  className?: string;
};
