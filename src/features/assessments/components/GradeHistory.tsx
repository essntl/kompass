import type { Grade, SubjectColor } from '@shared/types';
import { motion } from 'motion/react';
import { cn, subjectColor } from '@/components/ui';
import { formatDayShort } from '@/lib/date';
import { staggerDelay, tween } from '@/lib/motion';
import type { GradePoint } from '../logic/averages';

/* Static class names so Tailwind generates them: bar height = grade / 6. */
const HEIGHTS: Record<Grade, string> = {
  1: 'h-1/6',
  2: 'h-2/6',
  3: 'h-3/6',
  4: 'h-4/6',
  5: 'h-5/6',
  6: 'h-full',
};

export interface GradeHistoryProps {
  points: GradePoint[];
  color: SubjectColor;
  className?: string;
}

/**
 * A small bar chart of the grades so far, oldest on the left. Every bar has its grade
 * written under it, so the chart never relies on height or colour alone.
 */
export function GradeHistory({ points, color, className }: GradeHistoryProps) {
  if (points.length === 0) return null;
  const solid = subjectColor(color).solid;
  const description = points.map((p) => `${p.grade} (${formatDayShort(p.date)})`).join(', ');

  return (
    <div
      role="img"
      aria-label={`Karakterene dine så langt, eldste først: ${description}`}
      className={cn('flex items-end gap-1.5', className)}
    >
      {points.map((point, index) => (
        <div key={point.id} className="flex w-6 flex-col items-center gap-1">
          <div className="flex h-10 w-full items-end rounded-sm bg-surface-2">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ ...tween.slow, delay: 0.1 + staggerDelay(index) }}
              style={{ originY: 1 }}
              className={cn('w-full rounded-sm', HEIGHTS[point.grade], solid)}
            />
          </div>
          <span aria-hidden className="nums text-caption font-semibold text-ink-2">
            {point.grade}
          </span>
        </div>
      ))}
    </div>
  );
}
