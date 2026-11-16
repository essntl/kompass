import { addDays } from 'date-fns';
import type { Message, Thread } from '@shared/types';
import { TEACHER_IDS } from './teachers';
import { SEED_PLACEMENT_NAME } from './timetable';

/** Thread ids are derived from the teacher id so links survive a reset. */
export const threadIdFor = (teacherId: string) => `th-${teacherId.replace(/^t-/, '')}`;

/** The thread that starts with an unread teacher message. */
export const SEED_UNREAD_THREAD_ID = threadIdFor(TEACHER_IDS.hilde);

/** `n` school days (Mon–Fri) before `now`, at the given wall time. */
export function schoolDaysAgo(now: Date, n: number, time: string): Date {
  let date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let left = n;
  while (left > 0) {
    date = addDays(date, -1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date;
}

type Line = [from: Message['from'], schoolDaysBack: number, time: string, text: string];

const CONVERSATIONS: Array<{ teacherId: string; lines: Line[] }> = [
  {
    teacherId: TEACHER_IDS.hilde,
    lines: [
      ['teacher', 7, '14:20', 'Hei Sara. Det er tid for utviklingssamtale. Passer det på onsdag i lunsjen, rett etter kroppsøving?'],
      ['student', 7, '15:02', 'Hei. Ja, det passer fint.'],
      ['teacher', 3, '12:10', 'Fint arbeid med boksen i verkstedet. Bøyene ble jevne og målene stemte. Ta gjerne et bilde og legg det i porteføljen din.'],
      ['student', 3, '16:41', 'Takk. Jeg har lagt det inn nå.'],
    ],
  },
  {
    teacherId: TEACHER_IDS.morten,
    lines: [
      ['teacher', 9, '10:05', `Hei. Utplasseringen på torsdager er hos ${SEED_PLACEMENT_NAME} i Dronning Margretes vei 15. Møt opp i resepsjonen kl. 10:30 og spør etter Bjørn. Han er fadderen din.`],
      ['student', 9, '10:32', 'Ok, takk. Må jeg ha med egne vernesko?'],
      ['teacher', 9, '11:48', 'Ja, ta med vernesko. Hørselvern og vernebriller får du der.'],
      ['student', 2, '15:20', 'Hei. Jeg får ikke motoren til å bytte retning i den nye styringsoppgaven. Kan vi se på koblingen på fredag?'],
      ['teacher', 2, '15:54', 'Klart det. Ta med koblingsskjemaet, så feilsøker vi sammen.'],
    ],
  },
  {
    teacherId: TEACHER_IDS.ingrid,
    lines: [
      ['teacher', 5, '13:45', 'Hei Sara. Husk engelskteksten om et yrke du har lyst til å prøve. Du leverer i Teams innen fredag.'],
      ['student', 5, '14:10', 'Hei. Kan jeg skrive om industrimekaniker?'],
      ['teacher', 5, '14:26', 'Ja, det er et godt valg. Skriv gjerne om en vanlig arbeidsdag.'],
    ],
  },
  {
    teacherId: TEACHER_IDS.amir,
    lines: [
      ['teacher', 4, '09:15', 'Hei. Det blir snart prøve i likninger og formler. Datoen står i timeplanen. Øv på oppgavene i kapittel 3.'],
      ['student', 4, '11:32', 'Får vi bruke formelark?'],
      ['teacher', 4, '12:03', 'Ja, ett A4-ark med egne notater er lov.'],
    ],
  },
  {
    teacherId: TEACHER_IDS.kristian,
    lines: [
      ['teacher', 6, '08:40', 'Hei. På onsdag er vi ute på kunstgresset. Kle deg etter været.'],
      ['student', 6, '08:57', 'Ok. Jeg har litt vondt i kneet, men jeg prøver å være med.'],
      ['teacher', 6, '09:20', 'Fint at du sier fra. Da tilpasser vi økta, og du tar det i ditt eget tempo.'],
    ],
  },
];

const UNREAD_TEXT =
  'Hei Sara. På onsdag fortsetter vi med sveising i verkstedet. Ta med vernesko og arbeidstøy. Si fra hvis du mangler noe av utstyret, så finner vi en løsning.';

/** Threads and message history for the seed teachers, with timestamps relative to `now`. */
export function buildSeedMessages(now: Date = new Date()): { threads: Thread[]; messages: Message[] } {
  const threads: Thread[] = [];
  const messages: Message[] = [];

  for (const { teacherId, lines } of CONVERSATIONS) {
    const threadId = threadIdFor(teacherId);
    threads.push({ id: threadId, teacherId });
    lines.forEach(([from, daysBack, time, text], index) => {
      messages.push({
        id: `m-${threadId}-${index + 1}`,
        threadId,
        from,
        text,
        sentAt: schoolDaysAgo(now, daysBack, time).toISOString(),
        read: true,
        kind: 'text',
      });
    });
  }

  messages.push({
    id: `m-${SEED_UNREAD_THREAD_ID}-unread`,
    threadId: SEED_UNREAD_THREAD_ID,
    from: 'teacher',
    text: UNREAD_TEXT,
    sentAt: new Date(now.getTime() - 47 * 60_000).toISOString(),
    read: false,
    kind: 'text',
  });

  return { threads, messages };
}
