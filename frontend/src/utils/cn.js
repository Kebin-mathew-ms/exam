import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge tailwind classes cleanly and prevent duplicates/conflicts.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
