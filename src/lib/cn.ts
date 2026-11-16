import { clsx, type ClassValue } from 'clsx';

/**
 * Joins class names. A thin `clsx` wrapper – it does NOT resolve conflicting
 * Tailwind utilities, so do not pass a class that fights one the component
 * already sets (use the component's props for that).
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
