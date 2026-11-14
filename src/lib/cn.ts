import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * clsx + tailwind-merge: later classes win over earlier ones (h-9 over a default h-11, p-0 over
 * p-4). Plain clsx keeps both and CSS order picks, which ignores what the caller asked for.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
