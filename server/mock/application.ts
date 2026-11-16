/**
 * Mock-mode application draft: a template filled from the student, the listing and the
 * chosen portfolio entries. It only repeats what it is given – no invented experience.
 */
import type { ApplicationTextRequest } from '../../shared/api';
import { asFirstPerson, joinList, leadSentences, lowerFirst, skillPhrase } from './text';

const firstSentence = (text: string) => leadSentences(text, 1);

const ENTRY_OPENERS = ['Et eksempel er', 'Jeg har også jobbet med', 'Et tredje eksempel er'];

function describeEntry(entry: ApplicationTextRequest['entries'][number], index: number): string {
  const opener = `${ENTRY_OPENERS[index] ?? 'Jeg har også jobbet med'} «${entry.title.trim()}».`;
  // Prefer the student's own words; fall back to the competence summary. Either is only
  // used when it reads as a first-person sentence.
  const detail = asFirstPerson(firstSentence(entry.note)) || asFirstPerson(firstSentence(entry.summary ?? ''));
  const skills = (entry.skills ?? [])
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(skillPhrase);
  const learned = skills.length > 0 ? `Der øvde jeg på ${joinList(skills)}.` : '';
  return [opener, detail, learned].filter(Boolean).join(' ');
}

/** "som industrimekaniker" for a job title, "i kjemiprosess" for the name of a trade. */
function tradePhrase(trade: string): string {
  const clean = lowerFirst(trade.replace(/\s+/g, ' ').trim());
  const head = clean.split(',')[0] ?? clean;
  return /(?:er|ør|kokk)$/u.test(head) ? `som ${clean}` : `i ${clean}`;
}

export function buildMockApplicationText(request: ApplicationTextRequest): string {
  const { student, listing, entries } = request;
  const programme = lowerFirst(student.programme.trim());
  const who = `Jeg heter ${student.name.trim()} og går ${student.year.trim()} ${programme}.`;

  const opening = listing
    ? `${who} Jeg søker læreplass ${tradePhrase(listing.trade)} hos ${listing.company.trim()}.`
    : `${who} Jeg søker læreplass og vil gjerne fortelle litt om hva jeg har jobbet med på skolen.`;

  const chosen = entries.slice(0, 3);
  const portfolio =
    chosen.length > 0
      ? `På skolen samler jeg arbeidet mitt i en portefølje. ${chosen.map(describeEntry).join(' ')}`
      : 'På skolen jobber vi mye praktisk, og jeg samler arbeidet mitt i en portefølje som jeg gjerne viser fram.';

  // The listing's requirements are not quoted back: the company wrote them, and echoing
  // them reads oddly. The motivation stays general and true for any student.
  const motivation = listing
    ? `Jeg liker å lære ved å gjøre ting i praksis, og jeg har lyst til å lære faget skikkelig hos ${listing.company.trim()}. Jeg tar gjerne imot veiledning og spør når det er noe jeg ikke kan.`
    : 'Jeg liker å lære ved å gjøre ting i praksis, og jeg har lyst til å lære faget skikkelig ute i en bedrift.';

  const closing = 'Jeg kommer gjerne på intervju og viser fram mer av det jeg har laget.';

  return [`Hei,`, opening, portfolio, motivation, closing, `Vennlig hilsen\n${student.name.trim()}`].join('\n\n');
}
