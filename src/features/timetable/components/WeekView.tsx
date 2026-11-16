import type { CalendarEvent, ISODate, Subject } from '@shared/types';
import { useIsDesktop } from '@/components/ui';
import { hourRangeFor, visibleWeekDays } from '../logic/layout';
import { TimeGrid } from './TimeGrid';

export interface WeekViewProps {
  anchor: ISODate;
  events: CalendarEvent[];
  subjects: Map<string, Subject>;
  now: Date;
  onOpenEvent: (event: CalendarEvent) => void;
  onOpenDay: (day: ISODate) => void;
}

/** Monday–Friday (plus the weekend when it has events). Compact blocks on a phone. */
export function WeekView({ anchor, events, subjects, now, onOpenEvent, onOpenDay }: WeekViewProps) {
  const isDesktop = useIsDesktop();
  const days = visibleWeekDays(events, anchor);
  return (
    <TimeGrid
      days={days}
      events={events}
      range={hourRangeFor(events, days)}
      hourPx={isDesktop ? 60 : 48}
      compact={!isDesktop}
      subjects={subjects}
      now={now}
      onOpenEvent={onOpenEvent}
      onOpenDay={onOpenDay}
    />
  );
}
