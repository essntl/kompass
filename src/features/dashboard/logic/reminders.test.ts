import { describe, expect, it } from 'vitest';
import type { AbsenceRecord, CalendarEvent, Listing, Message } from '@shared/types';
import { buildReminders, isUrgent, reminderWhen, type ReminderSources } from './reminders';

const now = new Date(2026, 10, 16, 7, 30); // Monday

const listing = (id: string, company: string, deadline: string): Listing => ({
  id,
  company,
  trade: 'Industrimekaniker',
  programme: 'Teknologi- og industrifag',
  title: 'Lærling',
  location: 'Drammen',
  county: 'Buskerud',
  deadline,
  positions: 1,
  startDate: '2027-08-15',
  postedAt: '2026-10-01',
  summary: '',
  description: '',
  tasks: [],
  requirements: [],
  offers: [],
  contactName: 'Kari',
  contactRole: 'Leder',
  logo: { initials: 'GM', color: 2 },
});

const message = (id: string, threadId: string, sentAt: string, read = false): Message => ({
  id,
  threadId,
  from: 'teacher',
  text: `Melding ${id}`,
  sentAt,
  read,
  kind: 'text',
});

const custom = (id: string, start: string): CalendarEvent => ({
  id,
  kind: 'custom',
  title: `Hendelse ${id}`,
  start,
  end: start.replace(/T\d\d/, 'T23'),
  room: 'Auditoriet',
  source: 'manual',
});

function sources(patch: Partial<ReminderSources> = {}): ReminderSources {
  return {
    listings: [],
    savedIds: [],
    applications: [],
    events: [],
    threads: [
      { id: 'th-hilde', teacherId: 't-hilde' },
      { id: 'th-amir', teacherId: 't-amir' },
    ],
    teachers: [
      { id: 't-hilde', name: 'Hilde Bakken', role: 'Kontaktlærer', subjectIds: [], color: 1 },
      { id: 't-amir', name: 'Amir Haddad', role: 'Faglærer', subjectIds: [], color: 4 },
    ],
    messages: [],
    absences: [],
    now,
    ...patch,
  };
}

describe('buildReminders', () => {
  it('is empty when nothing is going on', () => {
    expect(buildReminders(sources())).toEqual([]);
  });

  it('includes saved deadlines within 30 days, not passed, unsaved or applied ones', () => {
    const reminders = buildReminders(
      sources({
        listings: [
          listing('l-granbru', 'Granbru Maskinering', '2026-11-19'),
          listing('l-far', 'Langt Fram AS', '2026-12-30'),
          listing('l-past', 'For Sent AS', '2026-11-15'),
          listing('l-unsaved', 'Ikke Lagret AS', '2026-11-20'),
          listing('l-applied', 'Søkt AS', '2026-11-20'),
        ],
        savedIds: ['l-granbru', 'l-far', 'l-past', 'l-applied'],
        applications: [{ id: 'a', listingId: 'l-applied', entryIds: [], text: '', submittedAt: '' }],
      }),
    );
    expect(reminders).toEqual([
      {
        id: 'deadline-l-granbru',
        kind: 'deadline',
        title: 'Søknadsfrist: Granbru Maskinering',
        detail: 'Industrimekaniker · Drammen',
        due: '2026-11-19',
        href: '/laerlingplass/l-granbru',
      },
    ]);
  });

  it('includes custom events within 14 days that have not started', () => {
    const reminders = buildReminders(
      sources({
        events: [
          custom('soon', '2026-11-18T18:00'),
          custom('late', '2026-12-05T18:00'),
          custom('past', '2026-11-16T07:00'),
          { ...custom('class', '2026-11-17T08:15'), kind: 'class' },
        ],
      }),
    );
    expect(reminders.map((r) => r.id)).toEqual(['event-soon']);
    expect(reminders[0]).toMatchObject({ detail: 'Auditoriet', href: '/timeplan' });
  });

  it('groups unread messages per teacher', () => {
    const reminders = buildReminders(
      sources({
        messages: [
          message('1', 'th-hilde', '2026-11-16T06:00:00.000Z'),
          message('2', 'th-hilde', '2026-11-16T06:10:00.000Z'),
          message('3', 'th-amir', '2026-11-13T12:00:00.000Z'),
          message('4', 'th-amir', '2026-11-13T13:00:00.000Z', true),
          { ...message('5', 'th-amir', '2026-11-16T06:00:00.000Z'), from: 'student' },
        ],
      }),
    );
    expect(reminders.map((r) => r.title)).toEqual([
      'Ny melding fra Amir Haddad',
      '2 nye meldinger fra Hilde Bakken',
    ]);
    expect(reminders[1]).toMatchObject({ href: '/meldinger/th-hilde', detail: 'Melding 2' });
  });

  it('includes absences with a date from today on', () => {
    const absence = (id: string, dates: string[]): AbsenceRecord => ({
      id,
      dates,
      wholeDay: true,
      classEventIds: [],
      reason: 'sykdom',
      teacherIds: [],
      createdAt: '',
      source: 'form',
    });
    const reminders = buildReminders(
      sources({ absences: [absence('old', ['2026-11-12']), absence('next', ['2026-11-13', '2026-11-19'])] }),
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      kind: 'absence',
      title: 'Fravær meldt',
      due: '2026-11-19',
      detail: 'Hele dagen torsdag 19. november',
    });
  });

  it('sorts everything by due time', () => {
    const reminders = buildReminders(
      sources({
        listings: [listing('l-a', 'A', '2026-11-25'), listing('l-b', 'B', '2026-11-17')],
        savedIds: ['l-a', 'l-b'],
        events: [custom('e', '2026-11-20T13:15')],
        messages: [message('1', 'th-hilde', '2026-11-16T06:00:00.000Z')],
      }),
    );
    expect(reminders.map((r) => r.kind)).toEqual(['message', 'deadline', 'event', 'deadline']);
  });
});

describe('reminder labels', () => {
  const deadline = { id: 'd', kind: 'deadline' as const, title: '', href: '/', due: '2026-11-19' };

  it('labels each kind', () => {
    expect(reminderWhen(deadline, now)).toBe('om 3 dager');
    expect(reminderWhen({ ...deadline, kind: 'event', due: '2026-11-18T18:00' }, now)).toBe(
      'på onsdag kl. 18:00',
    );
    expect(reminderWhen({ ...deadline, kind: 'absence', due: '2026-11-17' }, now)).toBe('i morgen');
    expect(reminderWhen({ ...deadline, due: undefined }, now)).toBeNull();
  });

  it('marks deadlines within a week as urgent', () => {
    expect(isUrgent(deadline, now)).toBe(true);
    expect(isUrgent({ ...deadline, due: '2026-11-24' }, now)).toBe(false);
    expect(isUrgent({ ...deadline, kind: 'event' }, now)).toBe(false);
  });
});
