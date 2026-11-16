import type { CalendarEvent, Subject, Teacher } from '@shared/types';
import { CalendarPlus, MapPin, StickyNote } from 'lucide-react';
import { useId } from 'react';
import { ButtonLink, Card, cn, EmptyState, subjectColor } from '@/components/ui';
import {
  daysUntil,
  formatCountdown,
  formatDuration,
  formatTime,
  formatTimeRange,
  minutesBetween,
  relativeDay,
  toDate,
} from '@/lib/date';
import { useSubjectMap } from '@/stores/timetable';
import { useMessagesStore } from '@/stores/messages';
import { classProgress, type NextClassState } from '../logic/schedule';

export interface NextClassCardProps {
  state: NextClassState;
  now: Date;
  /** True when the timetable has no classes at all (not just none ahead). */
  timetableEmpty: boolean;
}

/**
 * The hero of the dashboard: the class that is going on now, or the next one, with a live
 * countdown. Laid out as label → big line → subject → details in every state, so the card
 * keeps its shape when a class starts or ends.
 */
export function NextClassCard({ state, now, timetableEmpty }: NextClassCardProps) {
  const subjects = useSubjectMap();
  const teachers = useMessagesStore((s) => s.teachers);
  const labelId = useId();

  if (state.kind === 'none') {
    return (
      <Card>
        <EmptyState
          size="compact"
          icon={<CalendarPlus />}
          title={timetableEmpty ? 'Ingen timeplan ennå' : 'Ingen flere timer'}
          description={
            timetableEmpty
              ? 'Legg inn timeplanen din, så ser du neste time her.'
              : 'Vi fant ingen timer de neste ukene. Sjekk timeplanen.'
          }
          action={
            <ButtonLink to="/timeplan" variant="soft">
              Åpne timeplanen
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  const { event } = state;
  const ongoing = state.kind === 'ongoing';
  const subject = event.subjectId ? subjects.get(event.subjectId) : undefined;

  return (
    <Card as="section" tone="primary" padding="lg" aria-labelledby={labelId}>
      <p id={labelId} className="text-small font-semibold opacity-85">
        {ongoing ? 'Pågår nå' : 'Neste time'}
      </p>

      <p
        className={cn(
          'mt-1 font-display font-semibold tracking-tight',
          // "om 12 min" gets the hero size; "på torsdag 08:15" is longer and steps down.
          ongoing || daysUntil(event.start, now) === 0 ? 'text-hero' : 'text-display',
        )}
      >
        {ongoing ? <Remaining event={event} now={now} /> : <Countdown event={event} now={now} />}
      </p>

      {ongoing ? <ProgressBar event={event} now={now} /> : null}

      <div className="mt-4">
        <SubjectPill event={event} subject={subject} />
      </div>

      <ClassDetails event={event} teachers={teachers} />

      {ongoing ? <AfterThis next={state.next} subjects={subjects} /> : null}
    </Card>
  );
}

// ---------------------------------------------------------------- parts

function Countdown({ event, now }: { event: CalendarEvent; now: Date }) {
  const start = toDate(event.start);
  // Today: "om 12 min". Another day: "i morgen 08:15", "på torsdag 08:15".
  if (daysUntil(start, now) === 0) {
    return <time dateTime={event.start}>{formatCountdown(start.getTime() - now.getTime())}</time>;
  }
  return (
    <time dateTime={event.start}>
      {relativeDay(start, now)} {formatTime(start)}
    </time>
  );
}

function Remaining({ event, now }: { event: CalendarEvent; now: Date }) {
  const left = Math.max(1, minutesBetween(now, event.end));
  return <span>{formatDuration(left)} igjen</span>;
}

function ProgressBar({ event, now }: { event: CalendarEvent; now: Date }) {
  const progress = classProgress(event, now);
  const percent = Math.round(progress * 100);
  return (
    <div
      role="progressbar"
      aria-label="Hvor langt timen har kommet"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent} prosent`}
      className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-ink/20"
    >
      {/* scaleX instead of width: the bar grows on the compositor, nothing reflows. */}
      <div
        className="h-full origin-left rounded-full bg-primary-ink transition-transform duration-300 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}

function SubjectPill({ event, subject }: { event: CalendarEvent; subject: Subject | undefined }) {
  const color = subjectColor(subject?.color ?? 7);
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-full py-1 pr-3 pl-2.5',
        color.soft,
        color.ink,
      )}
    >
      <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', color.solid)} />
      <span className="truncate text-heading font-semibold">{subject?.name ?? event.title}</span>
    </span>
  );
}

function ClassDetails({ event, teachers }: { event: CalendarEvent; teachers: Teacher[] }) {
  const teacher = event.teacherId ? teachers.find((t) => t.id === event.teacherId) : undefined;
  const meta = [event.room, teacher?.name].filter(Boolean).join(' · ');
  return (
    <div className="mt-3 flex flex-col gap-1.5 text-small">
      <p className="opacity-90">
        <time className="font-semibold" dateTime={event.start}>
          {formatTimeRange(event.start, event.end)}
        </time>
        {meta ? <span> · {meta}</span> : null}
      </p>
      {event.location ? (
        <p className="flex items-start gap-1.5 opacity-90">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="sr-only">Ikke på skolen: </span>
            {event.location.label}
          </span>
        </p>
      ) : null}
      {event.note ? (
        <p className="flex items-start gap-1.5 opacity-90">
          <StickyNote aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{event.note}</span>
        </p>
      ) : null}
    </div>
  );
}

function AfterThis({ next, subjects }: { next: CalendarEvent | null; subjects: Map<string, Subject> }) {
  const subject = next?.subjectId ? subjects.get(next.subjectId) : undefined;
  return (
    <p className="mt-4 border-t border-primary-ink/20 pt-3 text-small">
      {next ? (
        <>
          <span className="opacity-85">Etterpå: </span>
          <span className="font-semibold">{subject?.name ?? next.title}</span>
          <span className="opacity-85">
            {' '}
            kl. <time dateTime={next.start}>{formatTime(next.start)}</time>
            {next.room ? ` · ${next.room}` : next.location ? ` · ${next.location.label}` : ''}
          </span>
        </>
      ) : (
        <span className="opacity-85">Dette er siste time i dag.</span>
      )}
    </p>
  );
}
