import type { CalendarEvent, ISODate } from '@shared/types';
import { addDaysISO, formatDayShort, isWeekend, toISODate, toLocalDateTime } from '@/lib/date';
import { attendedClassesOn } from './planDay';
import { capitalize } from './format';

export interface DayOption {
  date: ISODate;
  label: string;
  hasClasses: boolean;
}

/**
 * The days the travel page offers: today, tomorrow and the next school days
 * (weekdays with classes), `count` in total, looking at most three weeks ahead.
 */
export function travelDays(events: CalendarEvent[], now: Date, count = 6): DayOption[] {
  const today = toISODate(now);
  const option = (date: ISODate, label: string): DayOption => ({
    date,
    label,
    hasClasses: attendedClassesOn(events, date).length > 0,
  });
  const days: DayOption[] = [option(today, 'I dag'), option(addDaysISO(today, 1), 'I morgen')];
  for (let offset = 2; offset < 21 && days.length < count; offset += 1) {
    const date = addDaysISO(today, offset);
    if (isWeekend(date)) continue;
    const day = option(date, capitalize(formatDayShort(date)));
    if (day.hasClasses) days.push(day);
  }
  return days;
}

/**
 * The day to open on: today while today's last class has not ended, otherwise the next
 * day in the list with classes (or today when there is none).
 */
export function defaultTravelDay(days: DayOption[], events: CalendarEvent[], now: Date): ISODate {
  const nowLocal = toLocalDateTime(now);
  const today = days[0];
  if (today?.hasClasses) {
    const classes = attendedClassesOn(events, today.date);
    if (classes.some((c) => c.end > nowLocal)) return today.date;
  }
  return days.slice(1).find((day) => day.hasClasses)?.date ?? days[0]?.date ?? toISODate(now);
}
