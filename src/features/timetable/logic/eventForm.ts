import type { CalendarEvent, ISODate, Place } from '@shared/types';
import { atTime, formatTime, toISODate } from '@/lib/date';

/** "Nytt fag …" in the subject picker. */
export const NEW_SUBJECT = '__new';

export interface EventFormValues {
  kind: 'class' | 'custom';
  /** Existing subject id, `NEW_SUBJECT`, or '' when nothing is picked. */
  subjectId: string;
  newSubject: string;
  title: string;
  date: ISODate;
  start: string;
  end: string;
  room: string;
  otherPlace: boolean;
  place: Place | null;
  note: string;
}

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>>;

export function emptyEventForm(date: ISODate): EventFormValues {
  return {
    kind: 'class',
    subjectId: '',
    newSubject: '',
    title: '',
    date,
    start: '08:15',
    end: '09:00',
    room: '',
    otherPlace: false,
    place: null,
    note: '',
  };
}

export function eventToForm(event: CalendarEvent): EventFormValues {
  return {
    kind: event.kind === 'class' ? 'class' : 'custom',
    subjectId: event.kind === 'class' ? (event.subjectId ?? '') : '',
    newSubject: '',
    title: event.kind === 'class' ? '' : event.title,
    date: toISODate(event.start),
    start: event.allDay ? '08:00' : formatTime(event.start),
    end: event.allDay ? '09:00' : formatTime(event.end),
    room: event.room ?? '',
    otherPlace: !!event.location,
    place: event.location ?? null,
    note: event.note ?? '',
  };
}

const TIME = /^\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Norwegian, inline error per field. Empty object = valid. */
export function validateEventForm(values: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {};
  if (values.kind === 'class') {
    if (!values.subjectId) errors.subjectId = 'Velg et fag.';
    else if (values.subjectId === NEW_SUBJECT && !values.newSubject.trim()) {
      errors.newSubject = 'Skriv navnet på faget.';
    }
  } else if (!values.title.trim()) {
    errors.title = 'Skriv en tittel.';
  }
  if (!DATE.test(values.date)) errors.date = 'Velg en dato.';
  if (!TIME.test(values.start)) errors.start = 'Velg når det starter.';
  if (!TIME.test(values.end)) errors.end = 'Velg når det slutter.';
  else if (TIME.test(values.start) && values.end <= values.start) {
    errors.end = 'Sluttid må være etter starttid.';
  }
  if (values.otherPlace && !values.place) {
    errors.place = 'Velg en adresse, eller slå av «Annet sted».';
  }
  return errors;
}

/** The event fields from a valid form. `subject` is the resolved subject for classes. */
export function formToEvent(
  values: EventFormValues,
  subject: { id: string; name: string } | null,
): Omit<CalendarEvent, 'id' | 'source'> {
  const room = values.room.trim();
  const note = values.note.trim();
  return {
    kind: values.kind,
    title: values.kind === 'class' && subject ? subject.name : values.title.trim(),
    start: atTime(values.date, values.start),
    end: atTime(values.date, values.end),
    ...(values.kind === 'class' && subject ? { subjectId: subject.id } : {}),
    ...(room ? { room } : {}),
    ...(values.otherPlace && values.place ? { location: values.place } : {}),
    ...(note ? { note } : {}),
  };
}
