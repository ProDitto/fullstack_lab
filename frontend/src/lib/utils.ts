import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNowStrict } from 'date-fns';

/**
 * A utility function to merge Tailwind CSS classes conditionally.
 * It combines the functionalities of `clsx` and `tailwind-merge`.
 * @param inputs - A list of class values (strings, objects, arrays).
 * @returns A string of merged Tailwind CSS classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a given date into a human-readable "time ago" string.
 * e.g., "5s", "1m", "3h", "3d"
 * @param date - The date to format.
 * @returns A string representing the time elapsed since the date.
 */
export function timeAgo(date: Date): string {
    return formatDistanceToNowStrict(date, { addSuffix: false })
      .replace(/about /g, '')
      .replace(/ seconds?/g, 's')
      .replace(/ minutes?/g, 'm')
      .replace(/ hours?/g, 'h')
      .replace(/ days?/g, 'd')
      .replace(/ months?/g, 'mo')
      .replace(/ years?/g, 'y');
}
