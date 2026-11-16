/**
 * Mock-mode application draft: a template filled from the student, the listing and the
 * chosen portfolio entries. It only repeats what it is given – no invented experience.
 */
import type { ApplicationTextRequest } from '../../shared/api';
import { joinList, leadSentences, lowerFirst } from './text';

const firstSentence = (text: string) => leadSentences(text, 1);

const ENTRY_OPENERS = ['Et eksempel er', 'Jeg har også jobbet med', 'Et tredje eksempel er'];

function describeEntry(entry: ApplicationTextRequest['entries'][number], index: number): string {
  const opener = `${ENTRY_OPENERS[index] ?? 'Jeg har også jobbet med'} «${entry.title.trim()}».`;
  // Prefer the student's own words; fall back to the competence summary.
  const detail = firstSentence(entry.note) || firstSentence(entry.summary ?? '');
  const skills = (entry.skills ?? []).slice(0, 3).map(lowerFirst);
  const learned = skills.length > 0 ? `Der fikk jeg øvd på ${joinList(skills)}.` : '';
  return [opener, detail, learned].filter(Boolean).join(' ');
}

export function buildMockApplicationText(request: ApplicationTextRequest): string {
  const { student, listing, entries } = request;
  const programme = lowerFirst(student.programme.trim());
  const who = `Jeg heter ${student.name.trim()} og går ${student.year.trim()} ${programme}.`;

  const opening = listing
    ? `${who} Jeg søker læreplass som ${lowerFirst(listing.trade.trim())} hos ${listing.company.trim()}.`
    : `${who} Jeg søker læreplass og vil gjerne fortelle litt om hva jeg har jobbet med på skolen.`;

  const chosen = entries.slice(0, 3);
  const portfolio =
    chosen.length > 0
      ? `På skolen samler jeg arbeidet mitt i en portefølje. ${chosen.map(describeEntry).join(' ')}`
      : 'På skolen jobber vi mye praktisk, og jeg samler arbeidet mitt i en portefølje som jeg gjerne viser fram.';

  const requirement = listing?.requirements.find((item) => item.trim().length > 0);
  const motivation = listing
    ? requirement
      ? `I utlysningen står det at dere ser etter «${lowerFirst(requirement.trim().replace(/[.!?]+$/, ''))}». Det vil jeg gjerne vise dere i praksis, og jeg har lyst til å lære faget skikkelig i en bedrift som deres.`
      : 'Jeg har lyst til å lære faget skikkelig i en bedrift som deres, og jeg liker å lære ved å gjøre ting i praksis.'
    : 'Jeg liker å lære ved å gjøre ting i praksis, og jeg har lyst til å lære faget skikkelig ute i en bedrift.';

  const closing = 'Jeg kommer gjerne på intervju og viser fram mer av det jeg har laget.';

  return [`Hei,`, opening, portfolio, motivation, closing, `Vennlig hilsen\n${student.name.trim()}`].join('\n\n');
}
