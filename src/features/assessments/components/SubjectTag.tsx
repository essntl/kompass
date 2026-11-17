import type { Subject } from '@shared/types';
import { cn, subjectColor } from '@/components/ui';

export interface SubjectTagProps {
  subject: Subject;
  className?: string;
}

/** Subject name on its soft colour with a dot, e.g. in the detail page header. */
export function SubjectTag({ subject, className }: SubjectTagProps) {
  const color = subjectColor(subject.color);
  return (
    <span
      className={cn(
        'inline-flex h-7 max-w-full items-center gap-2 rounded-full pr-3 pl-2.5 text-small font-semibold',
        color.soft,
        color.ink,
        className,
      )}
    >
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', color.solid)} />
      <span className="truncate">{subject.name}</span>
    </span>
  );
}
