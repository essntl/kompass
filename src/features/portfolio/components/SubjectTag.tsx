import type { Subject } from '@shared/types';
import { cn, subjectColor } from '@/components/ui';

export interface SubjectTagProps {
  subject: Subject;
  /** `short` uses the subject's short label (cards on a phone). */
  label?: 'name' | 'short';
  className?: string;
}

/** The subject as a small label in its own colour, with a dot so hue is not the only cue. */
export function SubjectTag({ subject, label = 'name', className }: SubjectTagProps) {
  const palette = subjectColor(subject.color);
  return (
    <span
      title={subject.name}
      className={cn(
        'inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-sm px-2 text-caption font-semibold',
        palette.soft,
        palette.ink,
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', palette.solid)} />
      <span className="truncate">{label === 'short' ? subject.short : subject.name}</span>
    </span>
  );
}
