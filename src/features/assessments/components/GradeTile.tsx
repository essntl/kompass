import type { Grade } from '@shared/types';
import { cn } from '@/components/ui';
import { gradeLabel } from '../logic/labels';

export interface GradeTileProps {
  grade: Grade | undefined;
  size?: 'md' | 'lg';
  className?: string;
}

const SIZES = {
  md: 'size-12 rounded-md text-title',
  lg: 'size-20 rounded-lg text-hero',
} as const;

/**
 * The grade as a number on a neutral tile. Deliberately the same colour for every grade:
 * the number carries the meaning, and a red "2" next to a green "5" would shout.
 * An assessment without a grade shows a dash; the accessible name says "Uten karakter".
 */
export function GradeTile({ grade, size = 'md', className }: GradeTileProps) {
  return (
    <span
      role="img"
      aria-label={gradeLabel(grade)}
      className={cn(
        'nums grid shrink-0 place-items-center bg-surface-2 font-display font-semibold text-ink',
        SIZES[size],
        grade === undefined && 'text-ink-2',
        className,
      )}
    >
      <span aria-hidden>{grade ?? '–'}</span>
    </span>
  );
}
