import type { CalendarEvent, ISODate, Subject } from '@shared/types';
import { CalendarPlus, ChevronRight, UserX } from 'lucide-react';
import { Badge, Button, cn, EmptyState, Stagger, StaggerItem } from '@/components/ui';
import { addDaysISO, formatDayLong, formatTimeRange, relativeDay, toISODate } from '@/lib/date';
import { isAbsentFrom } from '@/lib/timetable';
import { eventAppearance } from '../logic/appearance';
import { agendaDays, eventAriaLabel, KIND_LABEL } from '../logic/layout';
import { KindIcon } from './EventBlock';

export interface ListViewProps {
  from: ISODate;
  events: CalendarEvent[];
  subjects: Map<string, Subject>;
  now: Date;
  onOpenEvent: (event: CalendarEvent) => void;
  onAdd: (day: ISODate) => void;
}

export const LIST_DAYS = 14;

/** Agenda for two weeks from `from`, grouped by day. */
export function ListView({ from, events, subjects, now, onOpenEvent, onAdd }: ListViewProps) {
  const groups = agendaDays(events, from, LIST_DAYS);
  const today = toISODate(now);

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<CalendarPlus />}
        title="Ingenting de neste to ukene"
        description={`Fra ${formatDayLong(from)} til ${formatDayLong(addDaysISO(from, LIST_DAYS - 1))} står det ingenting i timeplanen.`}
        action={
          <Button variant="secondary" icon={<CalendarPlus />} onClick={() => onAdd(from)}>
            Legg til hendelse
          </Button>
        }
      />
    );
  }

  return (
    <Stagger key={from} as="ol" className="flex flex-col gap-6" aria-label="Agenda">
      {groups.map(({ day, events: dayEvents }) => {
        const relative = relativeDay(day, now);
        const isNear = relative === 'i dag' || relative === 'i morgen';
        return (
          <StaggerItem key={day} as="li">
            <h2 className="mb-2 flex items-baseline gap-2 text-small font-semibold text-ink-2">
              <span className={cn('capitalize', day === today && 'text-ink')}>{formatDayLong(day)}</span>
              {isNear ? <span className="font-normal">· {relative}</span> : null}
            </h2>
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {dayEvents.map((event) => {
                const subject = event.subjectId ? subjects.get(event.subjectId) : undefined;
                const absent = event.kind === 'class' && isAbsentFrom(event, events);
                const look = eventAppearance(event, subject);
                const place = event.room ?? event.location?.label;
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => onOpenEvent(event)}
                      aria-label={eventAriaLabel(event, { subject, absent })}
                      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-[background-color] duration-150 hover:bg-surface-hover focus-visible:-outline-offset-2"
                    >
                      <span aria-hidden className={cn('h-10 w-1 shrink-0 rounded-full', look.bar, absent && 'opacity-40')} />
                      <span className="w-24 shrink-0 text-small text-ink-2 nums">
                        {event.allDay ? 'Hele dagen' : formatTimeRange(event.start, event.end)}
                      </span>
                      <span className={cn('min-w-0 flex-1', absent && 'opacity-70')}>
                        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                          <KindIcon kind={event.kind} className="size-4 text-ink-2" />
                          <span className={cn('truncate', absent && 'line-through')}>{subject?.name ?? event.title}</span>
                        </span>
                        {place ? <span className="block truncate text-small text-ink-2">{place}</span> : null}
                      </span>
                      {absent ? (
                        <Badge tone="danger" icon={<UserX />}>
                          Fravær
                        </Badge>
                      ) : event.kind !== 'class' ? (
                        <Badge tone={event.kind === 'deadline' ? 'accent' : event.kind === 'absence' ? 'danger' : 'info'}>
                          {KIND_LABEL[event.kind]}
                        </Badge>
                      ) : null}
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-2" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
