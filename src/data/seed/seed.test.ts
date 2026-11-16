import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { daysUntil, isWeekend, minutesBetween, parseLocal, startOfWeekISO, weekDays } from '@/lib/date';
import { classesOn, firstClassOn, lastClassOn, nextClass } from '@/lib/timetable';
import { buildSeedListings, SEED_SAVED_LISTING_IDS } from './listings';
import { buildSeedMessages, schoolDaysAgo, SEED_UNREAD_THREAD_ID } from './messages';
import { SEED_PLACEMENT } from './places';
import { buildSeedPortfolio } from './portfolio';
import { SEED_SUBJECTS, SUBJECT_IDS } from './subjects';
import { SEED_TEACHERS } from './teachers';
import {
  buildSeedClasses,
  buildSeedCustomEvents,
  buildSeedEvents,
  seedRangeEnd,
  seedRangeStart,
} from './timetable';

// Wednesday 18 November 2026, 10:30.
const NOW = new Date(2026, 10, 18, 10, 30);

describe('subjects and teachers', () => {
  it('gives every subject its own colour and id', () => {
    expect(SEED_SUBJECTS).toHaveLength(8);
    expect(new Set(SEED_SUBJECTS.map((s) => s.color)).size).toBe(8);
    expect(new Set(SEED_SUBJECTS.map((s) => s.id)).size).toBe(8);
    expect(SEED_SUBJECTS.filter((s) => s.vocational).map((s) => s.id)).toEqual([
      SUBJECT_IDS.pt,
      SUBJECT_IDS.kst,
      SUBJECT_IDS.yff,
    ]);
  });

  it('has five teachers, one contact teacher, and a teacher for every subject', () => {
    expect(SEED_TEACHERS).toHaveLength(5);
    expect(SEED_TEACHERS.filter((t) => t.role === 'Kontaktlærer')).toHaveLength(1);
    for (const subject of SEED_SUBJECTS) {
      expect(SEED_TEACHERS.filter((t) => t.subjectIds.includes(subject.id))).toHaveLength(1);
    }
  });
});

describe('seed timetable', () => {
  const classes = buildSeedClasses(NOW);

  it('covers the previous week through four weeks ahead', () => {
    expect(seedRangeStart(NOW)).toBe('2026-11-09');
    expect(seedRangeEnd(NOW)).toBe('2026-12-18');
    const days = [...new Set(classes.map((e) => e.start.slice(0, 10)))].sort();
    expect(days[0]).toBe('2026-11-09');
    expect(days[days.length - 1]).toBe('2026-12-18');
    expect(days).toHaveLength(6 * 5);
    expect(days.some((day) => isWeekend(day))).toBe(false);
  });

  it('is deterministic, with unique and stable ids', () => {
    expect(buildSeedClasses(NOW)).toEqual(classes);
    expect(new Set(classes.map((e) => e.id)).size).toBe(classes.length);
    // Generated two days later in the same week: identical.
    expect(buildSeedClasses(new Date(2026, 10, 20, 8, 0))).toEqual(classes);
    // Generated a week later: the overlapping days keep their ids.
    const later = new Set(buildSeedClasses(new Date(2026, 10, 25, 8, 0)).map((e) => e.id));
    expect(later.has('seed-2026-11-16-0815')).toBe(true);
    expect(later.has('seed-2026-11-09-0815')).toBe(false);
  });

  it('links every class to a subject and the teacher of that subject', () => {
    for (const cls of classes) {
      const subject = SEED_SUBJECTS.find((s) => s.id === cls.subjectId);
      const teacher = SEED_TEACHERS.find((t) => t.id === cls.teacherId);
      expect(cls).toMatchObject({ kind: 'class', source: 'seed' });
      expect(subject?.name).toBe(cls.title);
      expect(teacher?.subjectIds).toContain(cls.subjectId);
      expect(parseLocal(cls.end).getTime()).toBeGreaterThan(parseLocal(cls.start).getTime());
    }
  });

  it('never overlaps two classes and keeps lessons a believable length', () => {
    for (const day of weekDays(NOW, 5)) {
      const today = classesOn(classes, day);
      expect(today.length).toBeGreaterThanOrEqual(2);
      today.forEach((cls, index) => {
        const length = minutesBetween(cls.start, cls.end);
        expect(length).toBeGreaterThanOrEqual(45);
        expect(length).toBeLessThanOrEqual(270);
        const next = today[index + 1];
        if (next) expect(next.start >= cls.end).toBe(true);
      });
    }
  });

  it('does not start at the same time every day and has one shorter day', () => {
    const [mon, tue, wed, thu, fri] = weekDays(NOW, 5) as [string, string, string, string, string];
    expect(firstClassOn(classes, mon)?.start.slice(11)).toBe('08:15');
    expect(firstClassOn(classes, tue)?.start.slice(11)).toBe('09:55');
    const ends = [mon, tue, wed, thu, fri].map((d) => lastClassOn(classes, d)?.end.slice(11) ?? '');
    expect(ends[4]).toBe('12:55');
    expect(ends.slice(0, 4).every((end) => end > '14:00')).toBe(true);
  });

  it('puts YFF on Thursday at the placement, with a class at school the same day', () => {
    const thursdays = classes.filter((e) => parseLocal(e.start).getDay() === 4);
    const away = classes.filter((e) => e.location);
    expect(away).toHaveLength(6);
    for (const yff of away) {
      expect(yff.subjectId).toBe(SUBJECT_IDS.yff);
      expect(yff.location).toEqual(SEED_PLACEMENT);
      expect(parseLocal(yff.start).getDay()).toBe(4);
      const sameDay = classesOn(thursdays, yff.start).filter((e) => !e.location);
      expect(sameDay.length).toBeGreaterThanOrEqual(1);
      // Time to get from the school to the placement.
      expect(minutesBetween(sameDay[0]?.end ?? yff.start, yff.start)).toBeGreaterThanOrEqual(30);
    }
  });

  it('always has a next class', () => {
    expect(nextClass(classes, NOW)?.start).toBe('2026-11-18T12:05');
    expect(nextClass(classes, new Date(2026, 10, 21, 9, 0))?.start).toBe('2026-11-23T08:15');
  });

  it('adds custom events in the coming weeks', () => {
    const custom = buildSeedCustomEvents(NOW);
    expect(custom.map((e) => e.title)).toEqual(['Foreldremøte', 'Bedriftsbesøk']);
    for (const event of custom) {
      expect(event).toMatchObject({ kind: 'custom', source: 'seed' });
      expect(daysUntil(event.start, NOW)).toBeGreaterThan(0);
      expect(daysUntil(event.start, NOW)).toBeLessThanOrEqual(28);
      // Does not collide with a class.
      expect(classes.some((c) => c.start < event.end && c.end > event.start)).toBe(false);
    }
    expect(buildSeedEvents(NOW)).toHaveLength(classes.length + custom.length);
  });
});

describe('seed messages', () => {
  const { threads, messages } = buildSeedMessages(NOW);

  it('has one thread per teacher with 2–6 messages in time order', () => {
    expect(threads.map((t) => t.teacherId).sort()).toEqual(SEED_TEACHERS.map((t) => t.id).sort());
    for (const thread of threads) {
      const own = messages.filter((m) => m.threadId === thread.id);
      expect(own.length).toBeGreaterThanOrEqual(2);
      expect(own.length).toBeLessThanOrEqual(6);
      const times = own.map((m) => m.sentAt);
      expect([...times].sort()).toEqual(times);
    }
    expect(new Set(messages.map((m) => m.id)).size).toBe(messages.length);
  });

  it('has exactly one thread with an unread teacher message', () => {
    const unread = messages.filter((m) => !m.read);
    expect(unread).toHaveLength(1);
    expect(unread[0]).toMatchObject({ from: 'teacher', threadId: SEED_UNREAD_THREAD_ID });
    // The unread message is the newest one in its thread.
    const inThread = messages.filter((m) => m.threadId === SEED_UNREAD_THREAD_ID);
    expect(inThread[inThread.length - 1]).toBe(unread[0]);
  });

  it('only contains messages from the past, sent on school days', () => {
    for (const message of messages) {
      expect(new Date(message.sentAt).getTime()).toBeLessThan(NOW.getTime());
    }
    for (const message of messages.filter((m) => m.read)) {
      expect(isWeekend(new Date(message.sentAt))).toBe(false);
    }
  });

  it('counts school days backwards over weekends', () => {
    // Monday 16 November → one school day back is Friday 13 November.
    const friday = schoolDaysAgo(new Date(2026, 10, 16, 9, 0), 1, '14:20');
    expect(friday.getTime()).toBe(new Date(2026, 10, 13, 14, 20).getTime());
  });
});

describe('seed portfolio', () => {
  const entries = buildSeedPortfolio(NOW);

  it('has five entries from the last two months', () => {
    expect(entries).toHaveLength(5);
    expect(new Set(entries.map((e) => e.id)).size).toBe(5);
    for (const entry of entries) {
      const age = -daysUntil(entry.date, NOW);
      expect(age).toBeGreaterThan(0);
      expect(age).toBeLessThanOrEqual(62);
      expect(new Date(entry.createdAt).getTime()).toBeLessThan(NOW.getTime());
      expect(entry.note.length).toBeGreaterThan(40);
      expect(entry.tags.length).toBeGreaterThanOrEqual(2);
      expect(SEED_SUBJECTS.some((s) => s.id === entry.subjectId)).toBe(true);
    }
  });

  it('puts every entry on a weekday, newest first, whatever day it is today', () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const now = new Date(2026, 10, 16 + offset, 12, 0);
      const dates = buildSeedPortfolio(now).map((e) => e.date);
      for (const date of dates) expect([0, 6], date).not.toContain(new Date(`${date}T12:00`).getDay());
      expect([...dates].sort().reverse()).toEqual(dates);
    }
  });

  it('gives every entry a finished competence description', () => {
    for (const entry of entries) {
      expect(entry.competence?.mock).toBe(false);
      expect(entry.competence?.summary.length).toBeGreaterThan(20);
      expect(entry.competence?.skills.length).toBeGreaterThanOrEqual(3);
      expect(entry.competence?.suggestedGoals.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('points every photo at an SVG that exists under public/', () => {
    for (const entry of entries) {
      expect(entry.photo).toMatch(/^asset:\/seed\/portfolio\/[a-z-]+\.svg$/);
      const file = resolve(process.cwd(), 'public', (entry.photo ?? '').replace('asset:/', ''));
      expect(existsSync(file), file).toBe(true);
    }
    expect(new Set(entries.map((e) => e.photo)).size).toBe(5);
  });
});

describe('seed listings', () => {
  const listings = buildSeedListings(NOW);

  it('has twenty listings with unique ids and companies', () => {
    expect(listings).toHaveLength(20);
    expect(new Set(listings.map((l) => l.id)).size).toBe(20);
    expect(new Set(listings.map((l) => l.company)).size).toBe(20);
  });

  it('spreads the deadlines from 3 to 75 days ahead, one of them within a week', () => {
    const days = listings.map((l) => daysUntil(l.deadline, NOW));
    expect(Math.min(...days)).toBe(3);
    expect(Math.max(...days)).toBe(75);
    expect(days.filter((d) => d <= 7)).toHaveLength(1);
    expect(new Set(days).size).toBe(20);
  });

  it('keeps the other dates consistent', () => {
    for (const listing of listings) {
      expect(daysUntil(listing.postedAt, NOW)).toBeLessThan(0);
      expect(listing.startDate > listing.deadline).toBe(true);
      expect(parseLocal(listing.startDate).getMonth()).toBe(7);
      expect(listing.startDate.startsWith('2027-08')).toBe(true);
    }
    // In spring the apprenticeship starts the same year.
    const spring = buildSeedListings(new Date(2027, 2, 10, 9, 0));
    expect(spring.every((l) => l.startDate.startsWith('2027-08'))).toBe(true);
  });

  it('is filled in the way a real listing is', () => {
    for (const listing of listings) {
      expect(listing.positions).toBeGreaterThanOrEqual(1);
      expect(listing.summary.length).toBeGreaterThan(40);
      expect(listing.description.split('\n\n').length).toBeGreaterThanOrEqual(2);
      expect(listing.tasks.length).toBeGreaterThanOrEqual(4);
      expect(listing.requirements.length).toBeGreaterThanOrEqual(3);
      expect(listing.offers.length).toBeGreaterThanOrEqual(3);
      expect(listing.contactName).not.toBe('');
      expect(listing.logo.initials).toMatch(/^[A-ZÆØÅ]{2}$/);
    }
  });

  it('leans towards technology and industry trades and the Oslo area', () => {
    const tif = listings.filter((l) => l.programme === 'Teknologi- og industrifag');
    expect(tif.length).toBeGreaterThanOrEqual(12);
    expect(new Set(listings.map((l) => l.programme)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(listings.map((l) => l.trade)).size).toBeGreaterThanOrEqual(12);
    const osloArea = listings.filter((l) => l.county === 'Oslo' || l.county === 'Akershus');
    expect(osloArea.length).toBeGreaterThanOrEqual(8);
    expect(new Set(listings.map((l) => l.county)).size).toBeGreaterThanOrEqual(8);
  });

  it('starts with two saved listings, one with a deadline this week', () => {
    expect(SEED_SAVED_LISTING_IDS).toHaveLength(2);
    const saved = listings.filter((l) => SEED_SAVED_LISTING_IDS.includes(l.id));
    expect(saved).toHaveLength(2);
    expect(saved.some((l) => daysUntil(l.deadline, NOW) <= 7)).toBe(true);
  });

  it('follows the week the app is opened in', () => {
    expect(startOfWeekISO(NOW)).toBe('2026-11-16');
    expect(buildSeedListings(new Date(2026, 10, 19, 9, 0))[0]?.deadline).toBe('2026-11-22');
  });
});
