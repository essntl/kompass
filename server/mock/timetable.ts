/**
 * Mock-mode answer for the PDF timetable import: the app's sample week for 1TIA (the same
 * lessons as src/data/seed/timetable.ts and public/sample/eksempel-timeplan.ics), in the
 * shape the model returns. The uploaded PDF itself is not read in mock mode.
 */
import type { TimetableOutput, TimetableOutputLesson } from '../prompts/timetable';

const lesson = (
  weekday: TimetableOutputLesson['weekday'],
  start: string,
  end: string,
  subject: string,
  room: string | null,
  teacher: string,
  address: string | null = null,
): TimetableOutputLesson => ({ weekday, date: null, start, end, subject, room, teacher, address });

export const MOCK_TIMETABLE: TimetableOutput = {
  isTimetable: true,
  weekNumber: null,
  year: null,
  lessons: [
    lesson('mandag', '08:15', '11:15', 'Produksjon og tjenester', 'Verksted 2', 'Hilde Bakken'),
    lesson('mandag', '12:00', '13:30', 'Matematikk 1P-Y', 'B214', 'Amir Rahimi'),
    lesson('mandag', '13:40', '14:25', 'Norsk', 'B214', 'Ingrid Solheim'),
    lesson('tirsdag', '09:55', '11:25', 'Engelsk', 'B216', 'Ingrid Solheim'),
    lesson('tirsdag', '12:05', '14:35', 'Konstruksjons- og styringsteknikk', 'Verksted 1', 'Morten Aasen'),
    lesson('onsdag', '08:15', '09:45', 'Naturfag', 'Naturfagrom C108', 'Amir Rahimi'),
    lesson('onsdag', '09:55', '11:25', 'Kroppsøving', 'Gymsal', 'Kristian Dahl'),
    lesson('onsdag', '12:05', '15:05', 'Produksjon og tjenester', 'Verksted 2', 'Hilde Bakken'),
    lesson('torsdag', '08:15', '09:45', 'Engelsk', 'B216', 'Ingrid Solheim'),
    lesson('torsdag', '10:30', '15:00', 'Yrkesfaglig fordypning', null, 'Morten Aasen', 'Dronning Margretes vei 15, Oslo'),
    lesson('fredag', '08:15', '10:30', 'Konstruksjons- og styringsteknikk', 'Elektrolab A105', 'Morten Aasen'),
    lesson('fredag', '10:45', '11:30', 'Norsk', 'B214', 'Ingrid Solheim'),
    lesson('fredag', '12:10', '12:55', 'Matematikk 1P-Y', 'B214', 'Amir Rahimi'),
  ],
};
