import type { AssessmentKind, Subject } from '@shared/types';
import { cn, subjectColor } from '@/components/ui';
import { KIND_ICONS } from './kindIcons';

export interface KindTileProps {
  kind: AssessmentKind;
  subject: Subject;
  className?: string;
}

/** The kind's icon on the subject's soft colour. Decorative: the label is written next to it. */
export function KindTile({ kind, subject, className }: KindTileProps) {
  const Icon = KIND_ICONS[kind];
  const color = subjectColor(subject.color);
  return (
    <span
      aria-hidden
      className={cn('grid size-11 shrink-0 place-items-center rounded-md', color.soft, color.ink, className)}
    >
      <Icon className="size-5" />
    </span>
  );
}
