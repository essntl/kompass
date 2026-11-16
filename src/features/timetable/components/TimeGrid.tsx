import type { CalendarEvent, ISODate, Subject } from '@shared/types';
import { cn } from '@/components/ui';
import { formatDayLong, formatWeekday, toDate, toISODate } from '@/lib/date';
import { isAbsentFrom, minutesOfDay } from '@/lib/timetable';
import {
  allDayEventsOn,
  eventAriaLabel,
  gridEventsOn,
  placeEvents,
  type HourRange,
} from '../logic/layout';
import { eventAppearance } from '../logic/appearance';
import { upperFirst } from '../logic/labels';
import { EventBlock, KindIcon } from './EventBlock';

export interface TimeGridProps {
  days: ISODate[];
  events: CalendarEvent[];
  range: HourRange;
  hourPx: number;
  subjects: Map<string, Subject>;
  now: Date;
  /** Compact blocks (week view on a phone). */
  compact?: boolean;
  /** Week view: clickable day headers. */
  onOpenDay?: (day: ISODate) => void;
  onOpenEvent: (event: CalendarEvent) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The time grid shared by the day view (one column) and the week view (5–7 columns):
 * optional day headers, an all-day strip, hour labels and lines, events and a "now" line.
 */
export function TimeGrid({
  days,
  events,
  range,
  hourPx,
  subjects,
  now,
  compact,
  onOpenDay,
  onOpenEvent,
}: TimeGridProps) {
  const hours = Array.from({ length: range.end - range.start }, (_, i) => range.start + i);
  const height = (range.end - range.start) * hourPx;
  const today = toISODate(now);
  const nowMinutes = minutesOfDay(now);
  const nowOffset = ((nowMinutes - range.start * 60) / 60) * hourPx;
  const showNow = nowMinutes >= range.start * 60 && nowMinutes <= range.end * 60;
  const isWeek = days.length > 1;
  const gutter = isWeek ? 'w-9 desktop:w-12' : 'w-12';
  const columns = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };
  const allDayByDay = days.map((day) => allDayEventsOn(events, day));
  const hasAllDay = allDayByDay.some((list) => list.length > 0);

  return (
    <div className="flex flex-col px-0.5 pt-0.5">
      {isWeek ? (
        <div className="flex">
          <div className={cn('shrink-0', gutter)} />
          <div className="grid flex-1 gap-px" style={columns}>
            {days.map((day) => {
              const isToday = day === today;
              const date = toDate(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onOpenDay?.(day)}
                  aria-label={`Vis ${formatDayLong(day)}`}
                  aria-current={isToday ? 'date' : undefined}
                  className="flex min-h-12 min-w-0 flex-col items-center justify-center rounded-sm transition-[scale,background-color] duration-150 ease-out hover:bg-surface-hover active:scale-[0.97]"
                >
                  <span className="text-caption font-semibold text-ink-2">
                    {upperFirst(formatWeekday(day).slice(0, 3))}
                  </span>
                  <span
                    className={cn(
                      'grid size-7 place-items-center rounded-full text-small font-semibold nums',
                      isToday ? 'bg-primary text-primary-ink' : 'text-ink',
                    )}
                  >
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasAllDay ? (
        <div className="flex border-b border-line pb-1">
          <div className={cn('shrink-0 pt-1 pr-1 text-right text-caption text-ink-2', gutter)}>
            {isWeek ? null : 'Hele dagen'}
          </div>
          <div className="grid flex-1 gap-1" style={columns}>
            {allDayByDay.map((list, index) => (
              <ul key={days[index]} className="flex min-w-0 flex-col gap-1" aria-label={`Hele dagen, ${formatDayLong(days[index] ?? '')}`}>
                {list.map((event) => {
                  const look = eventAppearance(event, event.subjectId ? subjects.get(event.subjectId) : undefined);
                  return (
                    <li key={event.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenEvent(event)}
                        aria-label={eventAriaLabel(event, { withDay: isWeek ? formatDayLong(event.start) : undefined })}
                        className={cn(
                          'flex min-h-8 w-full min-w-0 items-center gap-1 rounded-sm px-1.5 text-left text-caption font-semibold',
                          'transition-[scale] duration-150 ease-out active:scale-[0.97]',
                          look.fill,
                          look.ink,
                        )}
                      >
                        <KindIcon kind={event.kind} className="size-3" />
                        <span className="truncate">{event.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative flex pt-2">
        {/* hour labels */}
        <div aria-hidden className={cn('relative shrink-0', gutter)} style={{ height }}>
          {hours.map((hour) => (
            <span
              key={hour}
              className="absolute right-1.5 -translate-y-1/2 text-caption text-ink-2 nums desktop:right-2"
              style={{ top: (hour - range.start) * hourPx }}
            >
              {pad(hour)}
              {isWeek ? null : ':00'}
            </span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height }}>
          {/* hour lines */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-line"
                style={{ top: (hour - range.start) * hourPx }}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 border-t border-line" />
          </div>

          <div className="relative grid h-full gap-px" style={columns}>
            {days.map((day) => {
              const dayEvents = gridEventsOn(events, day);
              const placed = placeEvents(dayEvents, day, range);
              const isToday = day === today;
              return (
                <div
                  key={day}
                  data-grid-column
                  role="list"
                  aria-label={formatDayLong(day)}
                  className={cn('relative h-full', isWeek && 'border-l border-line first:border-l-0')}
                >
                  {placed.map((item) => (
                    <div role="listitem" key={item.event.id}>
                      <EventBlock
                        placed={item}
                        subject={item.event.subjectId ? subjects.get(item.event.subjectId) : undefined}
                        absent={item.event.kind === 'class' && isAbsentFrom(item.event, events)}
                        hourPx={hourPx}
                        compact={compact}
                        dayLabel={isWeek ? formatDayLong(day) : undefined}
                        onOpen={onOpenEvent}
                      />
                    </div>
                  ))}
                  {isToday && showNow ? (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                      style={{ top: nowOffset }}
                    >
                      <span className="-ml-1 size-2 shrink-0 -translate-y-1/2 rounded-full bg-primary" />
                      <span className="h-0.5 flex-1 -translate-y-1/2 bg-primary" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
