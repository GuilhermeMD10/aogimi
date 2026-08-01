import Link from 'next/link';
import { cn } from '@/lib/util/cn';

type Props = {
  children: string;
  href: string;
  className?: string;
};

// The mono "VIEW ALL →" affordance in the corner of a card header. Always a
// navigation, so always an anchor — and always the caller's label, because the
// empty states change the wording ("Add a book" on an empty shelf) while the
// treatment stays identical.
export function MonoAction({ children, href, className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'font-[family-name:var(--face-mono)] text-[11.5px] tracking-[0.1em] text-(--muted)',
        'transition-opacity duration-120 ease-[ease] hover:opacity-75',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        className,
      )}
    >
      {children}
    </Link>
  );
}
