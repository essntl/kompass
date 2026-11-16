import type { Subject } from '@shared/types';
import { CalendarPlus, Check, ChevronRight, MapPin, UserX } from 'lucide-react';
import { Badge, ButtonLink, Card, cn, EmptyState, Section, subjectColor } from '@/components/ui';
import { formatTime, relativeDay } from '@/lib/date';
import { useSubjectMap } from '@/stores/timetable';
import { dayIsOver, type DayClass, type DayOverview } from '../logic/schedule';

export interface TodayClassesProps {
  overview: DayOverview | null;
  now: Date;
}

function headingFor(overview: DayOverview | null, now: Date): string {
  if (!overview || overview.isToday) return 'Dagens timer';
  // "Timer i morgen", "Timer på mandag", "Timer man. 23. nov."
  return `Timer ${relativeDay(overview.date, now)}`;
}

/** A compact timeline of the day: done, now and later, in subject colours. */
export function TodayClasses({ overview, now }: TodayClassesProps) {
  const subjects = useSubjectMap();

  return (
    <Section
      title={headingFor(overview, now)}
      action={
        <ButtonLink to="/timeplan" variant="ghost" size="sm" iconRight={<ChevronRight />}>
          Timeplan
        </ButtonLink>
      }
    >
      {!overview ? (
        <Card>
          <EmptyState
            size="compact"
            icon={<CalendarPlus />}
            title="Ingen timer"
            description="Når timeplanen er lagt inn, ser du dagens timer her."
          />
        </Card>
      ) : (
        <Card padding="none">
          {overview.isToday ? null : (
            <p className="border-b border-line px-4 py-2.5 text-small text-ink-2">
              Ingen timer i dag. Slik ser neste skoledag ut.
            </p>
          )}
          {overview.isToday && dayIsOver(overview) ? (
            <p className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-small text-ink-2">
              <Check aria-hidden className="size-4 shrink-0 text-success" />
              Ferdig for i dag.
            </p>
          ) : null}
          <ol className="py-1.5">
            {overview.classes.map((item, index) => (
              <ClassRow
                key={item.event.id}
                item={item}
                subject={item.event.subjectId ? subjects.get(item.event.subjectId) : undefined}
                last={index === overview.classes.length - 1}
              />
            ))}
          </ol>
        </Card>
      )}
    </Section>
  );
}

function ClassRow({ item, subject, last }: { item: DayClass; subject: Subject | undefined; last: boolean }) {
  const { event, status, absent } = item;
  const color = subjectColor(subject?.color ?? 7);
  const done = status === 'done';
  const place = event.location ? event.location.label : event.room;

  return (
    <li
      className="relative flex gap-3 px-4"
      aria-current={status === 'ongoing' ? 'time' : undefined}
    >
      {/* Time column */}
      <div className={cn('w-12 shrink-0 pt-2.5 text-small nums', done ? 'text-ink-3' : 'text-ink-2')}>
        <time dateTime={event.start} className={cn('block font-semibold', !done && 'text-ink')}>
          {formatTime(event.start)}
        </time>
        <time dateTime={event.end} className="block text-caption">
          {formatTime(event.end)}
        </time>
      </div>

      {/* One segment per class in the subject colour; finished and skipped ones fade back. */}
      <span
        aria-hidden
        className={cn('my-2.5 w-1 shrink-0 rounded-full', color.solid, (done || absent) && 'opacity-35')}
      />

      <div className={cn('min-w-0 flex-1 py-2.5', !last && 'border-b border-line')}>
        <div className="flex items-center gap-2">
          <p className={cn('min-w-0 flex-1 truncate font-semibold', done || absent ? 'text-ink-2' : 'text-ink')}>
            {subject?.name ?? event.title}
          </p>
          {absent ? (
            <Badge tone="danger" icon={<UserX />}>
              Fravær
            </Badge>
          ) : status === 'ongoing' ? (
            <Badge tone="primary">Nå</Badge>
          ) : done ? (
            <span className="flex items-center gap-1 text-caption text-ink-3">
              <Check aria-hidden className="size-3.5" />
              Ferdig
            </span>
          ) : null}
        </div>
        {place ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-small text-ink-2">
            {event.location ? <MapPin aria-hidden className="size-3.5 shrink-0" /> : null}
            <span className="truncate">{place}</span>
          </p>
        ) : null}
      </div>
    </li>
  );
}
