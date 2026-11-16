import type { ApplicationTextRequest } from '@shared/api';
import type { Listing, PortfolioEntry, StudentProfile } from '@shared/types';

/** At most this many portfolio entries can be attached to one application. */
export const MAX_ATTACHED_ENTRIES = 5;

/** Shortest text we accept before "Neste" (a sentence or two). */
export const MIN_TEXT_LENGTH = 20;

/** Body for `streamApplicationText`, with each entry's competence summary and skills when present. */
export function buildApplicationTextRequest(
  student: StudentProfile,
  listing: Listing,
  entries: readonly PortfolioEntry[],
): ApplicationTextRequest {
  return {
    student: { name: student.name, year: student.year, programme: student.programme },
    listing: {
      company: listing.company,
      trade: listing.trade,
      title: listing.title,
      summary: listing.summary,
      requirements: listing.requirements,
    },
    entries: entries.map((entry) => ({
      title: entry.title,
      note: entry.note,
      date: entry.date,
      ...(entry.competence?.summary ? { summary: entry.competence.summary } : {}),
      ...(entry.competence?.skills?.length ? { skills: entry.competence.skills } : {}),
    })),
  };
}

/** Plain text with blank lines between paragraphs → trimmed paragraphs. */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function hasEnoughText(text: string): boolean {
  return text.trim().length >= MIN_TEXT_LENGTH;
}

/** Keeps the selection in the order of `ids`, capped at the maximum and limited to existing entries. */
export function toggleEntry(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  if (ids.length >= MAX_ATTACHED_ENTRIES) return [...ids];
  return [...ids, id];
}
