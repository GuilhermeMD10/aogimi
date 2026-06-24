import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class combiner — merges duplicate / conflicting classes. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
