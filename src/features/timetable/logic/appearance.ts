import type { CalendarEvent, Subject } from '@shared/types';
import { subjectColor } from '@/components/ui';

/**
 * Colour classes for an event block. Classes use their subject colour; the other kinds use
 * the calendar tokens from contracts §4 (absence = danger, custom = info, deadline = accent).
 * All strings are static so Tailwind can see them.
 */
export interface EventAppearance {
  /** Soft fill. */
  fill: string;
  /** Text colour that is AA on `fill`. */
  ink: string;
  /** Solid colour for the leading bar and legend dots. */
  bar: string;
  /** Hover fill. */
  hover: string;
}

const KIND_APPEARANCE: Record<Exclude<CalendarEvent['kind'], 'class'>, EventAppearance> = {
  absence: {
    fill: 'bg-danger-soft',
    ink: 'text-danger-soft-ink',
    bar: 'bg-danger',
    hover: 'hover:brightness-[0.97]',
  },
  custom: {
    fill: 'bg-info-soft',
    ink: 'text-info-soft-ink',
    bar: 'bg-info',
    hover: 'hover:brightness-[0.97]',
  },
  deadline: {
    fill: 'bg-accent-soft',
    ink: 'text-accent-soft-ink',
    bar: 'bg-accent',
    hover: 'hover:brightness-[0.97]',
  },
};

export function eventAppearance(event: CalendarEvent, subject: Subject | undefined): EventAppearance {
  if (event.kind !== 'class') return KIND_APPEARANCE[event.kind];
  const color = subjectColor(subject?.color ?? 7);
  return { fill: color.soft, ink: color.ink, bar: color.solid, hover: color.softHover };
}

/** Diagonal hatch over an absent class (functional texture, token colour only). */
export const ABSENT_HATCH =
  'bg-[repeating-linear-gradient(135deg,var(--danger-soft)_0_5px,transparent_5px_10px)]';
