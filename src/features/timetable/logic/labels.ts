import { formatDayLong, formatDayShort, formatWeekday, type DateInput } from '@/lib/date';

/**
 * Capitalises only the first letter of a label. Norwegian month and weekday names are
 * lower-case inside a sentence, so CSS `text-transform: capitalize` (every word) is wrong
 * for "mandag 16. november".
 */
export function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Mandag 16. november" and, for narrow screens, "Mandag 16. nov.". */
export function dayTitles(input: DateInput): { long: string; short: string } {
  const dayAndMonth = formatDayShort(input).replace(/^\S+\s/, '');
  return {
    long: upperFirst(formatDayLong(input)),
    short: upperFirst(`${formatWeekday(input)} ${dayAndMonth}`),
  };
}
