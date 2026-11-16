import { describe, expect, it } from 'vitest';
import type { PortfolioEntry, StudentProfile, Subject } from '@shared/types';
import {
  addTags,
  buildApplicationRequest,
  buildDescribeRequest,
  capitalise,
  cleanTag,
  filterEntries,
  filterSubjects,
  groupByMonth,
  pickEntries,
  toggleSelection,
  validateEntry,
  type EntryDraft,
} from './logic';

function entry(id: string, date: string, subjectId?: string, extra: Partial<PortfolioEntry> = {}): PortfolioEntry {
  return {
    id,
    title: `Oppføring ${id}`,
    note: 'Et notat om arbeidet.',
    date,
    subjectId,
    tags: [],
    createdAt: `${date}T14:00:00.000Z`,
    ...extra,
  };
}

const SUBJECTS: Subject[] = [
  { id: 'subj-pt', name: 'Produksjon og tjenester', short: 'PT', color: 1, vocational: true },
  { id: 'subj-kst', name: 'Konstruksjon og styring', short: 'KST', color: 4, vocational: true },
  { id: 'subj-norsk', name: 'Norsk', short: 'Norsk', color: 3, vocational: false },
];

const PROFILE: StudentProfile = { name: 'Sara Nilsen', year: 'Vg1', programme: 'Teknologi- og industrifag' };

describe('filterEntries / filterSubjects', () => {
  const entries = [entry('a', '2026-11-10', 'subj-pt'), entry('b', '2026-10-02', 'subj-kst'), entry('c', '2026-10-01')];

  it('returns everything for "all" and only the subject otherwise', () => {
    expect(filterEntries(entries, 'all')).toHaveLength(3);
    expect(filterEntries(entries, 'subj-kst').map((e) => e.id)).toEqual(['b']);
  });

  it('lists only subjects with entries, in timetable order, keeping the active one', () => {
    expect(filterSubjects(entries, SUBJECTS).map((s) => s.id)).toEqual(['subj-pt', 'subj-kst']);
    expect(filterSubjects(entries, SUBJECTS, 'subj-norsk').map((s) => s.id)).toEqual([
      'subj-pt',
      'subj-kst',
      'subj-norsk',
    ]);
  });
});

describe('groupByMonth', () => {
  it('groups newest month first and sorts inside each month', () => {
    const groups = groupByMonth([
      entry('old', '2026-09-30'),
      entry('nov-early', '2026-11-02'),
      entry('oct', '2026-10-15'),
      entry('nov-late', '2026-11-12'),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['2026-11', '2026-10', '2026-09']);
    expect(groups[0]?.entries.map((e) => e.id)).toEqual(['nov-late', 'nov-early']);
  });

  it('returns no groups for no entries', () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it('capitalises month headings', () => {
    expect(capitalise('november 2026')).toBe('November 2026');
    expect(capitalise('')).toBe('');
  });
});

describe('tags', () => {
  it('cleans hashes and whitespace', () => {
    expect(cleanTag('  #sveising  ')).toBe('sveising');
    expect(cleanTag('   ')).toBeNull();
  });

  it('adds comma-separated tags without duplicates and stops at eight', () => {
    expect(addTags(['MAG'], 'mag, HMS, , hms, sveis')).toEqual(['MAG', 'HMS', 'sveis']);
    const many = addTags([], 'a,b,c,d,e,f,g,h,i,j');
    expect(many).toHaveLength(8);
  });
});

describe('validateEntry', () => {
  const valid: EntryDraft = {
    title: 'Sveiset hyllebrakett',
    note: 'Sveiset en brakett med MAG. Gikk bra etter litt øving.',
    date: '2026-11-10',
    subjectId: '',
    tags: [],
  };

  it('accepts a complete draft', () => {
    expect(validateEntry(valid, '2026-11-16')).toEqual({});
  });

  it('flags a missing title, a short note and a future date', () => {
    const errors = validateEntry({ ...valid, title: '  ', note: 'Kort', date: '2026-12-01' }, '2026-11-16');
    expect(Object.keys(errors).sort()).toEqual(['date', 'note', 'title']);
  });
});

describe('toggleSelection', () => {
  it('adds, removes and caps at five', () => {
    expect(toggleSelection([], 'a')).toEqual(['a']);
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleSelection(['1', '2', '3', '4', '5'], '6')).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('request builders', () => {
  it('builds the describe request with subject and image when present', () => {
    const image = { mediaType: 'image/jpeg' as const, data: 'abc' };
    expect(
      buildDescribeRequest({ title: ' Boks ', note: ' Bøyde plate ' }, PROFILE, SUBJECTS[0], image),
    ).toEqual({
      title: 'Boks',
      note: 'Bøyde plate',
      subject: 'Produksjon og tjenester',
      programme: 'Teknologi- og industrifag',
      year: 'Vg1',
      image,
    });
    const bare = buildDescribeRequest({ title: 'Boks', note: 'x' }, PROFILE, undefined, null);
    expect(bare).not.toHaveProperty('subject');
    expect(bare).not.toHaveProperty('image');
  });

  it('builds a general application with summary and skills only when they exist', () => {
    const described = entry('a', '2026-11-10', 'subj-pt', {
      competence: {
        summary: 'Jeg har sveiset.',
        whatWasDone: 'Sveiset.',
        skills: ['MAG-sveising'],
        suggestedGoals: [],
        generatedAt: '2026-11-10T15:00:00.000Z',
        mock: false,
      },
    });
    const plain = entry('b', '2026-11-01');
    const request = buildApplicationRequest(PROFILE, pickEntries([plain, described], ['a', 'b', 'missing']));
    expect(request.listing).toBeUndefined();
    expect(request.student).toEqual({ name: 'Sara Nilsen', year: 'Vg1', programme: 'Teknologi- og industrifag' });
    expect(request.entries).toEqual([
      { title: 'Oppføring a', note: 'Et notat om arbeidet.', date: '2026-11-10', summary: 'Jeg har sveiset.', skills: ['MAG-sveising'] },
      { title: 'Oppføring b', note: 'Et notat om arbeidet.', date: '2026-11-01' },
    ]);
  });
});
