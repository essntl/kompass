import { CalendarClock, CalendarX, Hourglass } from 'lucide-react';
import type { ISODate } from '@shared/types';
import { Badge } from '@/components/ui';
import { formatDayShort } from '@/lib/date';
import { deadlineStatus } from '../logic/deadline';

export interface DeadlineBadgeProps {
  deadline: ISODate;
  /** Includes the date ("Frist fre. 20. nov. · om 4 dager"). Default true. */
  withDate?: boolean;
  now?: Date;
  className?: string;
}

/**
 * The deadline with its distance. Urgent (≤7 days) is amber with an hourglass, passed is
 * red with a crossed calendar – the icon and the wording carry it, not only the colour.
 */
export function DeadlineBadge({ deadline, withDate = true, now, className }: DeadlineBadgeProps) {
  const status = deadlineStatus(deadline, now);
  if (status.tone === 'expired') {
    return (
      <Badge tone="danger" icon={<CalendarX />} className={className}>
        {status.relative}
      </Badge>
    );
  }
  const urgent = status.tone === 'urgent';
  return (
    <Badge
      tone={urgent ? 'accent' : 'neutral'}
      icon={urgent ? <Hourglass /> : <CalendarClock />}
      className={className}
    >
      <span className="nums">
        {withDate ? (
          <>
            Frist <time dateTime={deadline}>{formatDayShort(deadline)}</time> · {status.relative}
          </>
        ) : (
          <>Frist {status.relative}</>
        )}
      </span>
    </Badge>
  );
}
