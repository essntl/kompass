import type { CalendarEvent, Subject } from '@shared/types';
import { CalendarDays, Flag, UserX } from 'lucide-react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/components/ui';
import { formatTime, formatTimeRange } from '@/lib/date';
import { ABSENT_HATCH, eventAppearance } from '../logic/appearance';
import { eventAriaLabel, type PlacedEvent } from '../logic/layout';

export interface EventBlockProps {
  placed: PlacedEvent;
  subject?: Subject;
  absent: boolean;
  /** Pixels per hour of the grid. */
  hourPx: number;
  /** Week view on a phone: short name + start time only. */
  compact?: boolean;
  /** Day name for the accessible label in the week view. */
  dayLabel?: string;
  onOpen: (event: CalendarEvent) => void;
}

/** Icon for kinds that are not classes, so colour is never the only signal. */
export function KindIcon({ kind, className }: { kind: CalendarEvent['kind']; className?: string }) {
  const icons: Partial<Record<CalendarEvent['kind'], ReactNode>> = {
    custom: <CalendarDays className={className} />,
    deadline: <Flag className={className} />,
    absence: <UserX className={className} />,
  };
  return icons[kind] ? <span aria-hidden className="inline-flex shrink-0">{icons[kind]}</span> : null;
}

/** Moves focus to the previous/next event in the same column with ↑/↓. */
function onArrowKeys(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const column = event.currentTarget.closest('[data-grid-column]');
  if (!column) return;
  const buttons = Array.from(column.querySelectorAll<HTMLButtonElement>('[data-event-block]'));
  const index = buttons.indexOf(event.currentTarget);
  const next = buttons[index + (event.key === 'ArrowDown' ? 1 : -1)];
  if (next) {
    event.preventDefault();
    next.focus();
  }
}

/** One event on the time grid, positioned absolutely within its day column. */
export function EventBlock({ placed, subject, absent, hourPx, compact, dayLabel, onOpen }: EventBlockProps) {
  const { event } = placed;
  const look = eventAppearance(event, subject);
  const heightPx = (placed.height / 60) * hourPx;
  const style: CSSProperties = {
    top: (placed.top / 60) * hourPx,
    height: Math.max(heightPx - 2, 18),
    left: `calc(${(placed.column / placed.columns) * 100}% + 1px)`,
    width: `calc(${100 / placed.columns}% - 2px)`,
  };
  const short = heightPx < 40;
  const name = compact ? (subject?.short ?? event.title) : (subject?.name ?? event.title);

  return (
    <button
      type="button"
      data-event-block
      style={style}
      aria-label={eventAriaLabel(event, { subject, absent, withDay: dayLabel })}
      onClick={() => onOpen(event)}
      onKeyDown={onArrowKeys}
      className={cn(
        'group absolute flex overflow-hidden rounded-sm text-left',
        'transition-[scale,filter] duration-150 ease-out active:scale-[0.97]',
        'focus-visible:z-10 focus-visible:outline-offset-1',
        look.fill,
        look.ink,
        look.hover,
      )}
    >
      <span aria-hidden className={cn('w-1 shrink-0', look.bar, absent && 'opacity-40')} />
      {absent ? <span aria-hidden className={cn('absolute inset-0 left-1', ABSENT_HATCH)} /> : null}
      <span
        className={cn(
          'relative flex min-w-0 flex-1 flex-col',
          compact ? 'px-1 py-0.5' : 'px-2 py-1',
          absent && 'opacity-70',
        )}
      >
        {compact ? (
          <>
            <span className="flex min-w-0 items-center gap-0.5 text-caption font-semibold">
              <KindIcon kind={absent ? 'absence' : event.kind} className="size-3" />
              <span className={cn('truncate', absent && 'line-through')}>{name}</span>
            </span>
            {!short ? <time className="truncate text-caption">{formatTime(event.start)}</time> : null}
          </>
        ) : (
          <>
            <span className="flex min-w-0 items-center gap-1 text-small font-semibold">
              <KindIcon kind={event.kind} className="size-3.5" />
              <span className={cn('truncate', absent && 'line-through')}>{name}</span>
              {short ? (
                <time className="ml-auto shrink-0 pl-1 text-caption font-normal">{formatTime(event.start)}</time>
              ) : null}
            </span>
            {!short ? (
              <span className="flex min-w-0 items-center gap-1.5 text-caption">
                <time className="shrink-0">{formatTimeRange(event.start, event.end)}</time>
                {event.room ? <span className="truncate">· {event.room}</span> : null}
              </span>
            ) : null}
            {absent && heightPx >= 64 ? (
              <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-danger-soft px-1.5 text-caption font-semibold text-danger-soft-ink">
                <UserX aria-hidden className="size-3" />
                Fravær
              </span>
            ) : null}
          </>
        )}
      </span>
      {absent && !compact && heightPx < 64 ? (
        <span className="relative mr-1 self-center rounded-full bg-danger-soft px-1.5 text-caption font-semibold text-danger-soft-ink">
          Fravær
        </span>
      ) : null}
    </button>
  );
}
