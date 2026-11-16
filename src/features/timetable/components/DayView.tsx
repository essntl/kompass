import type { CalendarEvent, ISODate, Subject } from '@shared/types';
import { CalendarPlus, Coffee } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import { isWeekend, weekDays } from '@/lib/date';
import { allDayEventsOn, gridEventsOn, hourRangeFor } from '../logic/layout';
import { TimeGrid } from './TimeGrid';

export interface DayViewProps {
  day: ISODate;
  events: CalendarEvent[];
  subjects: Map<string, Subject>;
  now: Date;
  onOpenEvent: (event: CalendarEvent) => void;
  onAdd: (day: ISODate) => void;
}

export const DAY_HOUR_PX = 64;

/** One day on a time grid. The hour range is fitted to the whole week, so swiping between
 *  days of the same week never changes the grid's height. */
export function DayView({ day, events, subjects, now, onOpenEvent, onAdd }: DayViewProps) {
  const hasTimed = gridEventsOn(events, day).length > 0;
  const hasAllDay = allDayEventsOn(events, day).length > 0;

  if (!hasTimed && !hasAllDay) {
    const weekend = isWeekend(day);
    return (
      <EmptyState
        icon={weekend ? <Coffee /> : <CalendarPlus />}
        title={weekend ? 'Helg, ingen timer' : 'Ingen timer denne dagen'}
        description={
          weekend
            ? 'Nyt fridagen. Sveip eller bruk pilene for å se neste skoledag.'
            : 'Det står ingenting i timeplanen. Du kan legge til noe selv.'
        }
        action={
          <Button variant="secondary" icon={<CalendarPlus />} onClick={() => onAdd(day)}>
            Legg til hendelse
          </Button>
        }
      />
    );
  }

  return (
    <TimeGrid
      days={[day]}
      events={events}
      range={hourRangeFor(events, weekDays(day, 7))}
      hourPx={DAY_HOUR_PX}
      subjects={subjects}
      now={now}
      onOpenEvent={onOpenEvent}
    />
  );
}
