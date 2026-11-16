import { describe, expect, it } from 'vitest';
import { SEED_TEACHERS } from '@/data/seed/teachers';
import {
  absenceDateOptions,
  absenceRecipients,
  classesForDates,
  hasErrors,
  initialAbsenceForm,
  pruneClassIds,
  recipientsSentence,
  toAbsenceInput,
  validateAbsenceForm,
  type AbsenceFormState,
} from './absenceForm';
import { EVENTS, TODAY, absenceEvent } from './testFixtures';

const form = (patch: Partial<AbsenceFormState>): AbsenceFormState => ({
  dates: [],
  scope: 'day',
  classIds: [],
  reason: null,
  text: '',
  ...patch,
});

describe('absenceDateOptions', () => {
  it('offers today, tomorrow and then the coming school days', () => {
    const options = absenceDateOptions(EVENTS, TODAY, [], 5);
    expect(options.map((o) => o.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-20',
      '2026-11-23',
    ]);
    expect(options[0]?.label).toBe('I dag');
    expect(options[1]?.label).toBe('I morgen');
    expect(options[2]?.label).toBe('Ons. 18. nov.');
  });

  it('falls back to weekdays with an empty timetable', () => {
    const options = absenceDateOptions([], TODAY, [], 7);
    expect(options.map((o) => o.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-23',
      '2026-11-24',
    ]);
  });

  it('always offers an extra (linked) day, but never a past or invalid one', () => {
    const dates = absenceDateOptions(
      EVENTS,
      TODAY,
      ['2026-12-07', '2026-11-01', '2026-02-31', 'nope'],
      3,
    ).map((o) => o.date);
    expect(dates).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-12-07']);
  });
});

describe('initialAbsenceForm', () => {
  it('opens empty without a preset', () => {
    expect(initialAbsenceForm(null, EVENTS, TODAY)).toEqual(form({}));
  });

  it('preselects a valid day as a whole day', () => {
    expect(initialAbsenceForm({ date: '2026-11-17' }, EVENTS, TODAY)).toEqual(
      form({ dates: ['2026-11-17'] }),
    );
  });

  it('preselects a class and its day, ignoring a contradicting date', () => {
    expect(initialAbsenceForm({ date: '2026-11-20', eventId: 'tue-gym' }, EVENTS, TODAY)).toEqual(
      form({ dates: ['2026-11-17'], scope: 'classes', classIds: ['tue-gym'] }),
    );
  });

  it('ignores past days, unknown classes and garbage', () => {
    expect(initialAbsenceForm({ date: '2026-11-13' }, EVENTS, TODAY)).toEqual(form({}));
    expect(initialAbsenceForm({ eventId: 'past-norsk' }, EVENTS, TODAY)).toEqual(form({}));
    expect(initialAbsenceForm({ date: '17.11.2026', eventId: 'x' }, EVENTS, TODAY)).toEqual(
      form({}),
    );
  });
});

describe('classesForDates / pruneClassIds', () => {
  it('groups the classes per chosen day in date order', () => {
    const groups = classesForDates(EVENTS, ['2026-11-18', '2026-11-17']);
    expect(groups.map((g) => [g.date, g.classes.map((c) => c.id)])).toEqual([
      ['2026-11-17', ['tue-norsk', 'tue-gym']],
      ['2026-11-18', ['wed-pt']],
    ]);
  });

  it('drops classes that are no longer on a chosen day', () => {
    expect(pruneClassIds(['tue-norsk', 'wed-pt'], ['2026-11-17'], EVENTS)).toEqual(['tue-norsk']);
  });
});

describe('validateAbsenceForm', () => {
  it('asks for a day and a reason', () => {
    expect(validateAbsenceForm(form({}), EVENTS)).toEqual({
      dates: 'Velg minst én dag.',
      reason: 'Velg en årsak.',
    });
  });

  it('asks for a class when "Velg timer" has none', () => {
    const errors = validateAbsenceForm(
      form({ dates: ['2026-11-17'], scope: 'classes', reason: 'sykdom' }),
      EVENTS,
    );
    expect(errors).toEqual({
      classes: 'Velg minst én time, eller bytt til hele dagen.',
    });
  });

  it('accepts a complete form', () => {
    expect(
      hasErrors(validateAbsenceForm(form({ dates: ['2026-11-17'], reason: 'sykdom' }), EVENTS)),
    ).toBe(false);
  });

  it('refuses to report the same absence twice', () => {
    const events = [...EVENTS, absenceEvent('a', '2026-11-17')];
    expect(
      validateAbsenceForm(form({ dates: ['2026-11-17'], reason: 'sykdom' }), events).form,
    ).toMatch(/allerede/);
  });
});

describe('toAbsenceInput', () => {
  it('builds what reportAbsence expects', () => {
    expect(
      toAbsenceInput(
        form({
          dates: ['2026-11-18', '2026-11-17'],
          scope: 'classes',
          classIds: ['tue-gym', 'fri-engelsk'],
          reason: 'familie',
          text: '  Begravelse  ',
        }),
        EVENTS,
      ),
    ).toEqual({
      dates: ['2026-11-17', '2026-11-18'],
      wholeDay: false,
      classEventIds: ['tue-gym'],
      reason: 'familie',
      text: 'Begravelse',
      source: 'form',
    });
  });
});

describe('absenceRecipients', () => {
  const context = { events: EVENTS, teachers: SEED_TEACHERS };

  it('tells the contact teacher and everyone with a class on a whole day', () => {
    const teachers = absenceRecipients(
      toAbsenceInput(form({ dates: ['2026-11-17'], reason: 'sykdom' }), EVENTS),
      context,
    );
    expect(teachers.map((t) => t.id)).toEqual(['t-hilde', 't-ingrid', 't-kristian']);
    expect(recipientsSentence(teachers)).toBe(
      'Hilde Bakken, Ingrid Solheim og Kristian Dahl får beskjed.',
    );
  });

  it('tells only the class teachers for single classes', () => {
    const input = toAbsenceInput(
      form({
        dates: ['2026-11-17'],
        scope: 'classes',
        classIds: ['tue-gym'],
        reason: 'sykdom',
      }),
      EVENTS,
    );
    expect(absenceRecipients(input, context).map((t) => t.id)).toEqual(['t-kristian']);
  });

  it('is empty while the form is incomplete', () => {
    expect(absenceRecipients(toAbsenceInput(form({}), EVENTS), context)).toEqual([]);
    expect(recipientsSentence([])).toMatch(/Ingen/);
  });
});
