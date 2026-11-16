import type { SubjectColor } from '@shared/types';
import { cn } from '@/lib/cn';
import { subjectColor } from './subjectColor';

const SIZES = {
  sm: 'size-8 text-caption',
  md: 'size-10 text-small',
  lg: 'size-12 text-body',
  xl: 'size-16 text-heading',
} as const;

export interface AvatarProps {
  /** Full name; the avatar shows the first and last initial. */
  name: string;
  color: SubjectColor;
  size?: keyof typeof SIZES;
  /** `square` for company logos, `circle` (default) for people. */
  shape?: 'circle' | 'square';
  /** Override the computed initials, e.g. a company's `logo.initials`. */
  initials?: string;
  className?: string;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toLocaleUpperCase('nb');
}

/**
 * Initials on a soft subject colour. Decorative: the name is expected to be
 * written next to it, so it is hidden from screen readers.
 */
export function Avatar({
  name,
  color,
  size = 'md',
  shape = 'circle',
  initials,
  className,
}: AvatarProps) {
  const palette = subjectColor(color);
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center font-semibold select-none',
        shape === 'circle' ? 'rounded-full' : 'rounded-md',
        SIZES[size],
        palette.soft,
        palette.ink,
        className,
      )}
    >
      {initials ?? initialsOf(name)}
    </span>
  );
}
