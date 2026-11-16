/** Small text helpers shared by the mock templates. */

/** Lower-cases the first letter, but leaves acronyms such as "HMS" alone. */
export function lowerFirst(text: string): string {
  if (!text) return text;
  const second = text[1];
  if (second && second === second.toUpperCase() && second !== second.toLowerCase()) return text;
  return text[0].toLowerCase() + text.slice(1);
}

/** Collapses whitespace and makes sure the text ends with sentence punctuation. */
export function endSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** The first `max` sentences of a text, tidied up. */
export function leadSentences(text: string, max: number): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map(endSentence)
    .join(' ');
}

/**
 * "a, b og c". Items that contain "og" themselves ("HMS og verneutstyr") go last and are
 * set off with commas, so the list never reads "sveising og HMS og verneutstyr".
 */
export function joinList(items: string[]): string {
  const simple = items.filter((item) => !/\sog\s/.test(item));
  const compound = items.filter((item) => /\sog\s/.test(item));
  if (compound.length === 0) {
    if (simple.length <= 1) return simple.join('');
    return `${simple.slice(0, -1).join(', ')} og ${simple[simple.length - 1]}`;
  }
  return [...simple, ...compound].join(', ');
}

/** Common first words of skills written as a verb phrase ("Lese koblingsskjema"). */
const INFINITIVES = new Set([
  'bruke', 'bygge', 'bøye', 'dreie', 'feilsøke', 'file', 'finne', 'følge', 'frese', 'gjøre',
  'jobbe', 'kappe', 'klargjøre', 'koble', 'lage', 'legge', 'lese', 'lodde', 'male', 'måle',
  'merke', 'pusse', 'rette', 'sage', 'samarbeide', 'sette', 'skru', 'slipe', 'stelle', 'sveise',
  'tegne', 'teste', 'tilpasse', 'utføre', 'velge', 'vurdere', 'arbeide', 'beregne', 'bore',
  'gjennomføre', 'planlegge', 'skrive', 'snakke', 'ta', 'tilberede', 'rengjøre', 'vaske',
]);

/**
 * A skill as it reads after "øve på": nouns stay ("sveising"), verb phrases get "å"
 * ("å lese koblingsskjema"). Lower-cased like `lowerFirst`.
 */
export function skillPhrase(skill: string): string {
  const text = lowerFirst(skill.replace(/\s+/g, ' ').trim());
  const first = text.split(' ')[0]?.toLowerCase() ?? '';
  const isVerb = INFINITIVES.has(first) || /^\p{L}{3,}ere$/u.test(first);
  return isVerb ? `å ${text}` : text;
}

/** Pronouns that make a sentence first person. */
const FIRST_PERSON = /(?<!\p{L})(?:jeg|vi|meg|oss)(?!\p{L})/iu;
/** First words that end like a past-tense verb but are not one. */
const NOT_VERBS = new Set([
  'det', 'dette', 'de', 'hele', 'alle', 'andre', 'første', 'siste', 'neste', 'samme', 'selve',
  'gode', 'store', 'nye', 'egne', 'flere', 'ute', 'inne', 'bare', 'mitt', 'litt', 'bakerste',
]);

/**
 * A sentence from the student's note in first person, or '' when it cannot be made so.
 * Notes are often written without a subject ("Koblet en styring …"): those get "Jeg".
 */
export function asFirstPerson(sentence: string): string {
  const text = endSentence(sentence);
  if (!text) return '';
  if (FIRST_PERSON.test(text)) return text;
  const first = text.split(' ')[0]?.toLowerCase() ?? '';
  if (!NOT_VERBS.has(first) && /^\p{L}{3,}(?:et|te|de)$/u.test(first)) {
    return `Jeg ${lowerFirst(text)}`;
  }
  return '';
}
