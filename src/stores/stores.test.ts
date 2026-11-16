import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_SAVED_LISTING_IDS } from '@/data/seed/listings';
import { SEED_UNREAD_THREAD_ID, threadIdFor } from '@/data/seed/messages';
import { TEACHER_IDS } from '@/data/seed/teachers';
import { addDaysISO, startOfWeekISO, todayISO } from '@/lib/date';
import { classesOn, firstClassOn, nextClass } from '@/lib/timetable';
import { removeAbsence, reportAbsence } from './actions';
import { useApprenticeshipStore } from './apprenticeships';
import { countUnread, summariseThreads, useMessagesStore } from './messages';
import { usePortfolioStore } from './portfolio';
import { resetDemoData } from './reset';
import { useSettingsStore } from './settings';
import { useTimetableStore } from './timetable';

// These run in Node: the stores fall back to in-memory storage (see ./persist.ts).
const timetable = () => useTimetableStore.getState();
const messages = () => useMessagesStore.getState();
const portfolio = () => usePortfolioStore.getState();
const apprenticeships = () => useApprenticeshipStore.getState();

/** Thursday of the current week: Engelsk at school, then YFF at the placement. */
const thursday = () => addDaysISO(startOfWeekISO(new Date()), 3);

beforeEach(() => {
  timetable().reset();
  messages().reset();
  portfolio().reset();
  apprenticeships().reset();
});

describe('seeded stores', () => {
  it('start with the demo data around today', () => {
    expect(timetable().subjects).toHaveLength(8);
    expect(timetable().seedWeek).toBe(startOfWeekISO(new Date()));
    expect(nextClass(timetable().events, new Date())).not.toBeNull();
    expect(messages().teachers).toHaveLength(5);
    expect(countUnread(messages().messages)).toBe(1);
    expect(portfolio().entries).toHaveLength(5);
    expect(apprenticeships().listings).toHaveLength(20);
    expect(apprenticeships().savedIds).toEqual(SEED_SAVED_LISTING_IDS);
  });
});

describe('timetable store', () => {
  it('adds, updates and removes events', () => {
    const created = timetable().addEvent({
      kind: 'custom',
      title: 'Tannlege',
      start: `${todayISO()}T14:00`,
      end: `${todayISO()}T14:30`,
      source: 'manual',
    });
    expect(timetable().events).toContainEqual(created);
    timetable().updateEvent(created.id, { title: 'Tannlegetime', id: 'ignored' });
    expect(timetable().events.find((e) => e.id === created.id)?.title).toBe('Tannlegetime');
    timetable().removeEvent(created.id);
    expect(timetable().events.some((e) => e.id === created.id)).toBe(false);
  });

  it('imports ICS events and replaces earlier imports on request', () => {
    const ics = (title: string) => ({
      kind: 'class' as const,
      title,
      start: `${todayISO()}T08:00`,
      end: `${todayISO()}T08:45`,
      source: 'ics' as const,
    });
    expect(timetable().importEvents([ics('A'), ics('B')])).toBe(2);
    expect(timetable().importEvents([ics('C')], { replace: true })).toBe(1);
    const imported = timetable().events.filter((e) => e.source === 'ics');
    expect(imported.map((e) => e.title)).toEqual(['C']);
    expect(timetable().events.some((e) => e.source === 'seed')).toBe(true);
  });

  it('finds subjects by name or creates them with a free colour', () => {
    expect(timetable().ensureSubject('  norsk ').id).toBe('subj-norsk');
    expect(timetable().ensureSubject('YFF').id).toBe('subj-yff');
    const created = timetable().ensureSubject('Samfunnskunnskap');
    expect(created).toMatchObject({ name: 'Samfunnskunnskap', short: 'Samf', vocational: false });
    expect(created.color).toBeGreaterThanOrEqual(1);
    expect(created.color).toBeLessThanOrEqual(8);
    expect(timetable().ensureSubject('samfunnskunnskap')).toEqual(created);
    expect(timetable().subjects).toHaveLength(9);
  });

  it('clears classes and loads the sample timetable again', () => {
    const absence = reportAbsence({
      dates: [thursday()],
      wholeDay: true,
      classEventIds: [],
      reason: 'sykdom',
      source: 'form',
    });
    timetable().clearClasses();
    expect(timetable().events.some((e) => e.kind === 'class')).toBe(false);
    expect(timetable().events.some((e) => e.kind === 'custom')).toBe(true);
    expect(timetable().events.some((e) => e.absenceId === absence.id)).toBe(true);
    expect(timetable().seedWeek).toBeNull();

    timetable().loadSampleTimetable();
    expect(classesOn(timetable().events, thursday())).toHaveLength(2);
    timetable().loadSampleTimetable();
    expect(classesOn(timetable().events, thursday())).toHaveLength(2);
    expect(timetable().seedWeek).toBe(startOfWeekISO(new Date()));
  });

  it('moves stale seed classes to the current week and leaves other events alone', () => {
    const manual = timetable().addEvent({
      kind: 'class',
      title: 'Ekstra verkstedtime',
      start: `${todayISO()}T16:00`,
      end: `${todayISO()}T17:00`,
      source: 'manual',
    });
    expect(timetable().refreshSeedIfStale()).toBe(false);

    const sixWeeksOn = new Date();
    sixWeeksOn.setDate(sixWeeksOn.getDate() + 42);
    expect(timetable().refreshSeedIfStale(sixWeeksOn)).toBe(true);
    expect(timetable().seedWeek).toBe(startOfWeekISO(sixWeeksOn));
    expect(nextClass(timetable().events, sixWeeksOn)).not.toBeNull();
    expect(firstClassOn(timetable().events, addDaysISO(startOfWeekISO(sixWeeksOn), 28))).not.toBeNull();
    expect(timetable().events).toContainEqual(manual);
    expect(timetable().events.filter((e) => e.kind === 'custom')).toHaveLength(2);
    const seedIds = timetable().events.filter((e) => e.source === 'seed').map((e) => e.id);
    expect(new Set(seedIds).size).toBe(seedIds.length);
  });
});

describe('messages store', () => {
  it('sends, receives and marks as read', () => {
    const threadId = threadIdFor(TEACHER_IDS.amir);
    const sent = messages().sendMessage(threadId, '  Hei  ');
    expect(sent).toMatchObject({ from: 'student', text: 'Hei', read: true, kind: 'text' });
    const reply = messages().receiveMessage(threadId, 'Hei, Sara.');
    expect(reply).toMatchObject({ from: 'teacher', read: false });
    expect(countUnread(messages().messages)).toBe(2);
    expect(countUnread(messages().messages, threadId)).toBe(1);

    messages().markThreadRead(threadId);
    expect(countUnread(messages().messages, threadId)).toBe(0);
    messages().markThreadRead(SEED_UNREAD_THREAD_ID);
    expect(countUnread(messages().messages)).toBe(0);
  });

  it('summarises threads with the newest conversation first', () => {
    const { threads, teachers, messages: all } = messages();
    const summaries = summariseThreads(threads, teachers, all);
    expect(summaries).toHaveLength(5);
    expect(summaries[0]).toMatchObject({
      thread: { id: SEED_UNREAD_THREAD_ID },
      teacher: { name: 'Hilde Bakken' },
      unreadCount: 1,
    });
    expect(summaries.slice(1).every((s) => s.unreadCount === 0)).toBe(true);
  });

  it('creates a thread only when the teacher has none', () => {
    expect(messages().ensureThread(TEACHER_IDS.hilde).id).toBe(SEED_UNREAD_THREAD_ID);
    const created = messages().ensureThread('t-ny');
    expect(messages().threads).toContainEqual(created);
    expect(messages().ensureThread('t-ny')).toEqual(created);
  });
});

describe('reportAbsence / removeAbsence', () => {
  it('records a whole day, marks the calendar and notifies the teachers', () => {
    const before = messages().messages.length;
    const record = reportAbsence({
      dates: [thursday()],
      wholeDay: true,
      classEventIds: [],
      reason: 'sykdom',
      text: 'Feber.',
      source: 'form',
    });

    expect(record).toMatchObject({
      dates: [thursday()],
      wholeDay: true,
      classEventIds: [],
      reason: 'sykdom',
      text: 'Feber.',
      teacherIds: [TEACHER_IDS.hilde, TEACHER_IDS.ingrid, TEACHER_IDS.morten],
      source: 'form',
    });
    expect(messages().absences).toEqual([record]);

    const absenceEvents = timetable().events.filter((e) => e.absenceId === record.id);
    expect(absenceEvents).toHaveLength(1);
    expect(absenceEvents[0]).toMatchObject({ kind: 'absence', allDay: true, source: 'absence' });

    const notices = messages().messages.filter((m) => m.absenceId === record.id);
    expect(messages().messages).toHaveLength(before + 3);
    expect(notices.map((m) => m.threadId).sort()).toEqual(
      record.teacherIds.map(threadIdFor).sort(),
    );
    for (const notice of notices) {
      expect(notice).toMatchObject({ from: 'student', kind: 'absence', read: true });
      expect(notice.text).toContain('Årsak: Sykdom.');
      expect(notice.text.endsWith('Feber.')).toBe(true);
    }
    // Nothing became unread because of it.
    expect(countUnread(messages().messages)).toBe(1);
  });

  it('records single classes with their ids', () => {
    const english = firstClassOn(timetable().events, thursday());
    const record = reportAbsence({
      dates: [],
      wholeDay: false,
      classEventIds: [english?.id ?? ''],
      reason: 'lege_tannlege',
      source: 'ai',
    });
    expect(record).toMatchObject({
      dates: [thursday()],
      wholeDay: false,
      classEventIds: [english?.id],
      teacherIds: [TEACHER_IDS.ingrid],
      source: 'ai',
    });
    expect('text' in record).toBe(false);
    const [event] = timetable().events.filter((e) => e.absenceId === record.id);
    expect(event).toMatchObject({ kind: 'absence', start: english?.start, end: english?.end });
  });

  it('opens a thread for a teacher who has none', () => {
    useMessagesStore.setState((s) => ({
      threads: s.threads.filter((t) => t.teacherId !== TEACHER_IDS.ingrid),
    }));
    const record = reportAbsence({
      dates: [thursday()],
      wholeDay: true,
      classEventIds: [],
      reason: 'annet',
      source: 'form',
    });
    const thread = messages().threads.find((t) => t.teacherId === TEACHER_IDS.ingrid);
    expect(thread).toBeDefined();
    expect(
      messages().messages.some((m) => m.threadId === thread?.id && m.absenceId === record.id),
    ).toBe(true);
  });

  it('removes the record, the events and the notices again', () => {
    const eventsBefore = timetable().events.length;
    const messagesBefore = messages().messages.length;
    const record = reportAbsence({
      dates: [thursday()],
      wholeDay: true,
      classEventIds: [],
      reason: 'sykdom',
      source: 'form',
    });
    removeAbsence(record.id);
    expect(messages().absences).toEqual([]);
    expect(timetable().events).toHaveLength(eventsBefore);
    expect(messages().messages).toHaveLength(messagesBefore);
  });
});

describe('portfolio and apprenticeship stores', () => {
  it('adds, updates and removes portfolio entries', () => {
    const created = portfolio().addEntry({
      title: 'Gjenget hull',
      note: 'Boret og gjenget M8.',
      date: todayISO(),
      tags: ['gjenging'],
    });
    expect(portfolio().entries[0]).toEqual(created);
    portfolio().updateEntry(created.id, { title: 'Gjenget M8-hull' });
    expect(portfolio().entries[0]?.title).toBe('Gjenget M8-hull');
    portfolio().removeEntry(created.id);
    expect(portfolio().entries).toHaveLength(5);
  });

  it('toggles saved listings and stores applications', () => {
    apprenticeships().toggleSaved('l-dypvik');
    expect(apprenticeships().savedIds).toContain('l-dypvik');
    apprenticeships().toggleSaved('l-dypvik');
    expect(apprenticeships().savedIds).toEqual(SEED_SAVED_LISTING_IDS);

    const application = apprenticeships().submitApplication({
      listingId: 'l-tellverk',
      entryIds: ['pe-lathe'],
      text: 'Hei. Jeg søker læreplass hos dere.',
    });
    expect(apprenticeships().applications).toEqual([application]);
    expect(Number.isNaN(Date.parse(application.submittedAt))).toBe(false);
  });

  it('re-dates the listings once every deadline has passed', () => {
    expect(apprenticeships().refreshListingsIfExpired()).toBe(false);
    const nextSpring = new Date();
    nextSpring.setDate(nextSpring.getDate() + 120);
    expect(apprenticeships().refreshListingsIfExpired(nextSpring)).toBe(true);
    const ids = apprenticeships().listings.map((l) => l.id);
    expect(ids).toContain('l-tellverk');
    expect(apprenticeships().listings.every((l) => l.deadline > todayISO())).toBe(true);
  });
});

describe('resetDemoData', () => {
  it('restores every store, including settings', async () => {
    useSettingsStore.getState().setTheme('dark');
    useSettingsStore.getState().setProfile({ name: 'Test Testesen' });
    timetable().clearClasses();
    timetable().ensureSubject('Samfunnskunnskap');
    messages().markThreadRead(SEED_UNREAD_THREAD_ID);
    portfolio().removeEntry('pe-weld');
    apprenticeships().toggleSaved('l-tellverk');
    reportAbsence({
      dates: [todayISO()],
      wholeDay: true,
      classEventIds: [],
      reason: 'sykdom',
      source: 'form',
    });

    await resetDemoData();

    expect(useSettingsStore.getState().theme).toBe('system');
    expect(useSettingsStore.getState().profile.name).toBe('Sara Nilsen');
    expect(timetable().subjects).toHaveLength(8);
    expect(timetable().events.some((e) => e.kind === 'absence')).toBe(false);
    expect(classesOn(timetable().events, thursday())).toHaveLength(2);
    expect(messages().absences).toEqual([]);
    expect(countUnread(messages().messages)).toBe(1);
    expect(portfolio().entries.map((e) => e.id)).toContain('pe-weld');
    expect(apprenticeships().savedIds).toEqual(SEED_SAVED_LISTING_IDS);
  });
});
