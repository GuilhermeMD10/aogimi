import Link from 'next/link';

/**
 * The right-aligned exit in Help's and Credits' eyebrow rows. The browser
 * back button also works (they're real routes), but this is the drawn way
 * back and keeps working when the page was reached by direct link.
 */
export function BackToSettings() {
  return (
    <Link
      href="/settings"
      className="ml-auto font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.2em] uppercase text-(--faint) transition-colors duration-120 ease-[ease] hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
    >
      ← Back to settings
    </Link>
  );
}
