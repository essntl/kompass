import type { AbsenceReason } from '@shared/types';

/**
 * Canned teacher replies for the demo. Pure: the caller supplies the randomness, so the
 * picker is deterministic in tests. The wording is the teacher's voice – short, friendly,
 * Bokmål – and never promises anything the prototype cannot keep.
 */

export type ReplyCategory = 'absence' | 'question' | 'thanks' | 'greeting' | 'default';

export interface ReplyContext {
  /** The student's first name, used in a few variants. */
  studentName?: string;
  /** Returns a number in [0, 1). Defaults to `Math.random`. */
  random?: () => number;
}

type Variant = (name: string | undefined) => string;

/** Word-boundary aware regex that also treats æ, ø and å as letters. */
const word = (pattern: string) => new RegExp(`(?<!\\p{L})(?:${pattern})(?!\\p{L})`, 'u');

const SICK = word(
  'syk|sjuk|uvel|kvalm|feber|influensa|omgangssyke|forkjøl\\p{L}*|hodepine|migrene|kaster opp|' +
    '(?:er|ble|føler meg|kjenner meg) (?:så |litt |veldig )?dårlig',
);
// First person and concrete on purpose: "boka mi er borte" or "jeg vil bli lege" is not an absence.
const ABSENCE = word(
  'fravær\\p{L}*|jeg er borte|er jeg borte|være borte|blir borte|kommer ikke|kommer meg ikke|' +
    'kan ikke komme|kan ikke møte|rekker ikke|blir hjemme|legetime\\p{L}*|(?:hos|til) (?:lege|tannlege)\\p{L}*|' +
    'tannlegetime\\p{L}*|forsov\\p{L}*|forsinket|for sent|for sein|begravelse\\p{L}*|må (?:gå|dra) tidlig\\p{L}*',
);
// Question words, or a verb followed by a pronoun ("Kan jeg …", "Har vi …"): Norwegian
// questions start with the verb, statements with the subject.
const QUESTION_START = word(
  '^(?:hei[,.!]? )?(?:hva|hvor|hvordan|hvorfor|hvem|hvilke[nt]?|når|' +
    '(?:kan|kunne|må|skal|får|har|er|går|blir) (?:jeg|vi|du|det|man|dere))',
);
const THANKS = word('takk|tusen takk|takker|supert|flott|perfekt|kjempebra');
const GREETING = word('^(?:hei|heisann|hallo|halla|morn|god morgen|god dag|god kveld)');

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * What kind of message the student wrote. The order matters: a message that reports an
 * absence and also says thanks is an absence, and "Takk, men når er fristen?" is a question.
 */
export function classifyMessage(text: string): ReplyCategory {
  const clean = normalise(text);
  if (!clean) return 'default';
  if (SICK.test(clean) || ABSENCE.test(clean)) return 'absence';
  if (clean.includes('?') || QUESTION_START.test(clean)) return 'question';
  if (THANKS.test(clean)) return 'thanks';
  // "Hei" on its own is a greeting; "Hei. Jeg har levert oppgaven." is an ordinary message.
  if (GREETING.test(clean) && clean.split(' ').length <= 4) return 'greeting';
  return 'default';
}

/** Calls `text` with " Sara" when the name is known and "" otherwise. */
const withName = (name: string | undefined, text: (spacedName: string) => string) =>
  text(name ? ` ${name}` : '');

const SICK_REPLIES: Variant[] = [
  () => 'Takk for at du sier fra. God bedring.',
  () => 'Det er notert. Hvil deg, så tar vi igjen det du mister når du er tilbake.',
  (name) => withName(name, (n) => `God bedring${n}. Jeg legger ut det vi går gjennom i Teams.`),
];

const ABSENCE_REPLIES: Variant[] = [
  () => 'Takk for beskjed. Jeg noterer det.',
  () => 'Det er greit. Fint at du sier fra i god tid.',
  () => 'Notert. Si fra hvis du trenger hjelp med å ta igjen det du går glipp av.',
];

const REPLIES: Record<Exclude<ReplyCategory, 'absence'>, Variant[]> = {
  question: [
    () => 'Godt spørsmål. Jeg sjekker og svarer deg i løpet av dagen.',
    () => 'Det tar vi i neste time, så får alle med seg svaret. Minn meg gjerne på det.',
    () => 'Jeg må se litt på det først. Du får svar før neste time.',
  ],
  thanks: [
    () => 'Bare hyggelig.',
    () => 'Ingen årsak. Si fra hvis det er noe mer.',
    () => 'Det skulle bare mangle.',
  ],
  greeting: [
    (name) => withName(name, (n) => `Hei${n}. Hva kan jeg hjelpe deg med?`),
    () => 'Hei. Hva lurer du på?',
    (name) => withName(name, (n) => `Hei${n}. Bare skriv hva det gjelder.`),
  ],
  default: [
    () => 'Takk for meldingen. Jeg ser på det og svarer deg så snart jeg kan.',
    () => 'Den er mottatt. Vi snakkes i neste time.',
    () => 'Fint at du sier fra. Jeg kommer tilbake til deg.',
  ],
};

/** Acknowledgements for a structured absence notice, by reason. */
const NOTICE_REPLIES: Record<AbsenceReason, Variant[]> = {
  sykdom: SICK_REPLIES,
  lege_tannlege: [
    () => 'Takk for beskjed. Det er notert.',
    () => 'Det er greit. Si fra hvis du rekker noe av timen likevel.',
  ],
  familie: [
    () => 'Takk for at du sier fra. Det er notert.',
    () => 'Det er greit. Ta den tiden du trenger.',
  ],
  transport: [
    () => 'Takk for beskjed. Kom når du kan.',
    () => 'Notert. Slikt skjer, bare kom inn når du er framme.',
  ],
  annet: ABSENCE_REPLIES,
};

function choose(variants: Variant[], context: ReplyContext): string {
  const random = context.random ?? Math.random;
  const index = Math.min(variants.length - 1, Math.max(0, Math.floor(random() * variants.length)));
  const variant = variants[index] as Variant;
  return variant(firstName(context.studentName));
}

/** "Sara Nilsen" → "Sara". */
export function firstName(fullName: string | undefined): string | undefined {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || undefined;
}

/** The teacher's answer to an ordinary chat message. */
export function pickReply(text: string, context: ReplyContext = {}): string {
  const category = classifyMessage(text);
  if (category === 'absence') {
    return choose(SICK.test(normalise(text)) ? SICK_REPLIES : ABSENCE_REPLIES, context);
  }
  return choose(REPLIES[category], context);
}

/** The teacher's answer to a structured absence notice ("Meld fravær" or a confirmed suggestion). */
export function pickAbsenceAcknowledgement(
  reason: AbsenceReason,
  context: ReplyContext = {},
): string {
  return choose(NOTICE_REPLIES[reason] ?? ABSENCE_REPLIES, context);
}

export const REPLY_DELAY_MIN_MS = 1500;
export const REPLY_DELAY_MAX_MS = 4000;

/** How long the teacher "types" before the reply lands: 1.5–4 seconds. */
export function replyDelayMs(random: () => number = Math.random): number {
  const span = REPLY_DELAY_MAX_MS - REPLY_DELAY_MIN_MS;
  return Math.round(REPLY_DELAY_MIN_MS + Math.min(1, Math.max(0, random())) * span);
}
