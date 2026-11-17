import { CircleCheck, CircleDashed, Clock, Hourglass, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui';
import { STATUS_LABELS } from '../logic/labels';
import type { AssessmentStatus } from '../logic/status';

export interface StatusBadgeProps {
  status: AssessmentStatus;
  /** An upcoming hand-in reads "Ikke levert ennå" instead of "Kommende". */
  handIn?: boolean;
  className?: string;
}

/** Status of an assessment that has no result yet, always with an icon and a word. */
export function StatusBadge({ status, handIn = false, className }: StatusBadgeProps) {
  switch (status) {
    case 'submitted':
      return (
        <Badge tone="success" icon={<CircleCheck />} className={className}>
          {STATUS_LABELS.submitted}
        </Badge>
      );
    case 'overdue':
      return (
        <Badge tone="danger" icon={<TriangleAlert />} className={className}>
          {STATUS_LABELS.overdue}
        </Badge>
      );
    case 'awaiting':
      return (
        <Badge tone="neutral" icon={<Hourglass />} className={className}>
          {STATUS_LABELS.awaiting}
        </Badge>
      );
    case 'upcoming':
      return handIn ? (
        <Badge tone="neutral" icon={<CircleDashed />} className={className}>
          Ikke levert ennå
        </Badge>
      ) : (
        <Badge tone="neutral" icon={<Clock />} className={className}>
          {STATUS_LABELS.upcoming}
        </Badge>
      );
    case 'assessed':
      return null;
  }
}
