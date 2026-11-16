/**
 * Pure portfolio logic: filtering, grouping, validation and request builders.
 * No React, no stores – everything here is unit tested in logic.test.ts.
 */
import type { ApplicationTextRequest, PortfolioDescribeRequest } from '@shared/api';
import type { ISODate, PortfolioEntry, StudentProfile, Subject } from '@shared/types';

// ---------------------------------------------------------------- filtering

/** `'all'` or a subject id. */
export type SubjectFilter = 'all' | string;

export function filterEntries(entries: PortfolioEntry[], filter: SubjectFilter): PortfolioEntry[] {
  if (filter === 'all') return entries;
  return entries.filter((entry) => entry.subjectId === filter);
}

/**
 * Subjects for the filter chips: those that have at least one entry, in the timetable's
 * subject order. The active filter stays in the list even when its last entry is gone, so
 * the selected chip never vanishes from under the user.
 */
export function filterSubjects(
  entries: PortfolioEntry[],
  subjects: Subject[],
  active: SubjectFilter = 'all',
): Subject[] {
  const used = new Set(entries.map((entry) => entry.subjectId).filter(Boolean));
  return subjects.filter((subject) => used.has(subject.id) || subject.id === active);
}

// ---------------------------------------------------------------- grouping

export interface MonthGroup {
  /** `YYYY-MM`. */
  key: string;
  entries: PortfolioEntry[];
}

/** Groups entries by the month the work was done, newest month and newest entry first. */
export function groupByMonth(entries: PortfolioEntry[]): MonthGroup[] {
  const sorted = [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
  const groups: MonthGroup[] = [];
  for (const entry of sorted) {
    const key = entry.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(entry);
    else groups.push({ key, entries: [entry] });
  }
  return groups;
}

/** "november 2026" → "November 2026" (headings start with a capital in Norwegian too). */
export function capitalise(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase('nb-NO') + text.slice(1) : text;
}

// ---------------------------------------------------------------- tags

export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 24;

/** Cleans one typed tag: trims, drops a leading '#', collapses spaces. Empty → null. */
export function cleanTag(raw: string): string | null {
  const tag = raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim();
  if (!tag) return null;
  return tag.slice(0, MAX_TAG_LENGTH);
}

/**
 * Adds the comma-separated tags in `input` to `tags`, skipping duplicates
 * (case-insensitive) and stopping at `MAX_TAGS`.
 */
export function addTags(tags: string[], input: string): string[] {
  const next = [...tags];
  for (const part of input.split(',')) {
    const tag = cleanTag(part);
    if (!tag) continue;
    if (next.length >= MAX_TAGS) break;
    if (next.some((existing) => existing.toLocaleLowerCase('nb-NO') === tag.toLocaleLowerCase('nb-NO'))) {
      continue;
    }
    next.push(tag);
  }
  return next;
}

// ---------------------------------------------------------------- validation

export const MAX_TITLE_LENGTH = 80;
export const MAX_NOTE_LENGTH = 2000;

export interface EntryDraft {
  title: string;
  note: string;
  date: ISODate;
  subjectId: string;
  tags: string[];
}

export type EntryErrors = Partial<Record<'title' | 'note' | 'date', string>>;

/** Inline validation messages for the add/edit form. Empty object = valid. */
export function validateEntry(draft: EntryDraft, today: ISODate): EntryErrors {
  const errors: EntryErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'Gi oppføringen en tittel, for eksempel «Sveiset hyllebrakett».';
  else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Tittelen kan være på opptil ${MAX_TITLE_LENGTH} tegn.`;
  }

  const note = draft.note.trim();
  if (!note) errors.note = 'Skriv kort hva du laget og hvordan det gikk.';
  else if (note.length < 15) errors.note = 'Skriv litt mer, gjerne et par setninger.';
  else if (note.length > MAX_NOTE_LENGTH) errors.note = `Notatet kan være på opptil ${MAX_NOTE_LENGTH} tegn.`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) errors.date = 'Velg datoen da du gjorde arbeidet.';
  else if (draft.date > today) errors.date = 'Datoen kan ikke være fram i tid.';

  return errors;
}

export const hasErrors = (errors: EntryErrors) => Object.keys(errors).length > 0;

/** The store patch for a valid draft (trimmed, empty subject removed). */
export function draftToEntryFields(draft: EntryDraft): Pick<PortfolioEntry, 'title' | 'note' | 'date' | 'subjectId' | 'tags'> {
  return {
    title: draft.title.trim(),
    note: draft.note.trim(),
    date: draft.date,
    subjectId: draft.subjectId || undefined,
    tags: draft.tags,
  };
}

// ---------------------------------------------------------------- selection

export const MAX_SELECTION = 5;

/** Toggles `id` in the selection, never going past `max`. Order of selection is kept. */
export function toggleSelection(selected: string[], id: string, max = MAX_SELECTION): string[] {
  if (selected.includes(id)) return selected.filter((value) => value !== id);
  if (selected.length >= max) return selected;
  return [...selected, id];
}

// ---------------------------------------------------------------- request builders

export function buildDescribeRequest(
  entry: Pick<PortfolioEntry, 'title' | 'note'>,
  profile: StudentProfile,
  subject: Pick<Subject, 'name'> | undefined,
  image: PortfolioDescribeRequest['image'] | null,
): PortfolioDescribeRequest {
  const request: PortfolioDescribeRequest = {
    title: entry.title.trim(),
    note: entry.note.trim(),
    programme: profile.programme,
    year: profile.year,
  };
  if (subject) request.subject = subject.name;
  if (image) request.image = image;
  return request;
}

/**
 * A general apprenticeship application (no listing). Entries keep the order they were
 * picked in; each carries its competence summary and skills when it has them.
 */
export function buildApplicationRequest(
  profile: StudentProfile,
  entries: PortfolioEntry[],
): ApplicationTextRequest {
  return {
    student: { name: profile.name, year: profile.year, programme: profile.programme },
    entries: entries.map((entry) => {
      const item: ApplicationTextRequest['entries'][number] = {
        title: entry.title,
        note: entry.note,
        date: entry.date,
      };
      if (entry.competence?.summary) item.summary = entry.competence.summary;
      if (entry.competence?.skills.length) item.skills = entry.competence.skills;
      return item;
    }),
  };
}

/** Entries for the ids, in the order of the ids; unknown ids are dropped. */
export function pickEntries(entries: PortfolioEntry[], ids: string[]): PortfolioEntry[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return ids.map((id) => byId.get(id)).filter((entry): entry is PortfolioEntry => Boolean(entry));
}
