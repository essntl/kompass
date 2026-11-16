/**
 * Mock-mode absence detection: a careful keyword heuristic for Norwegian chat messages.
 * It is deliberately conservative – an ordinary message must never be flagged – and it
 * returns the same `RawDetection` shape as the live model, so the server validates both
 * the same way (see lib/absence.ts).
 */
import type { AbsenceDetectRequest } from '../../shared/api';
import type { ISODate } from '../../shared/types';
import { findMentionedSubjects, schoolDaysBetween, type RawDetection } from '../lib/absence';
import { addDays, isValidISODate, monthIndexNb, weekdayIndex, WEEKDAYS_NB } from '../lib/dates';

/** Word-boundary aware regex that also treats æ, ø and å as letters. */
const word = (pattern: string) => new RegExp(`(?<!\\p{L})(?:${pattern})(?!\\p{L})`, 'u');
/** Up to `n` filler words ("nok", "dessverre", "ganske" …) between two parts of a phrase. */
const filler = (n: number) => `(?: \\p{L}+){0,${n}}`;

const ILLNESS_WORDS = 'syk|sjuk|dårlig|uvel|kvalm|elendig';
const ILLNESS_NOUNS =
  'feber|influensa|omgangssyke|oppkast|kaster opp|spyr|spydd|migrene|hodepine|forkjøl\\p{L}*|korona|covid|halsbetennelse|ørebetennelse|vondt i \\p{L}+';

/** "jeg er syk", "ble dårlig i natt", "føler meg ikke bra". */
const SICK_STATEMENT = word(
  `(?:er|ble|blei|blitt|føler meg|kjenner meg|ligger|våknet|våkna)${filler(2)} (?:${ILLNESS_WORDS})|føler meg ikke(?: helt)? (?:bra|i form)|er ikke(?: helt)? i form`,
);
/** "har feber", "fått omgangssyke", "pga migrene". */
const SICK_WITH_CAUSE = word(`(?:har|fått|fikk|med|pga|på grunn av|grunnet)${filler(2)} (?:${ILLNESS_NOUNS})`);
const SICK_NOUN = word(ILLNESS_NOUNS);
const SICK_BARE = word('syk|sjuk');

const CANT_COME = [
  // "kommer ikke", "kommer meg nok dessverre ikke" – but not "kommer ikke til å bli ferdig".
  word(`(?:kommer|kjem|møter|stiller)(?: meg)?${filler(2)} ikke(?! til å)`),
  word('kommer ikke til å (?:komme|møte|være på skolen|være til stede|være der|delta|rekke (?:timen|skolen|første))'),
  word(`kan${filler(2)} ikke (?:komme|møte|stille|delta|være med|være der|være til stede)`),
  word(`rekker${filler(1)} ikke (?:\\p{L}*time\\p{L}*|skolen|første|fram|frem|å komme|å møte)`),
  word('får ikke (?:kommet|møtt|vært)'),
  word(`(?:blir|må være|må bli|må holde meg|holder meg)${filler(1)} (?:hjemme|borte)`),
  // First person only: "boka mi er borte" is not an absence.
  word(`(?:jeg|eg) er${filler(1)} borte|er (?:jeg|eg)${filler(1)} borte`),
  word('(?:er ikke|ikke er|ikke kommer til å være) (?:på skolen|til stede)'),
  word('må (?:gå|dra|stikke) (?:tidlig|tidligere|før)'),
  word('(?:jeg|eg|må) (?:går|drar|gå|dra) hjem'),
  word('meld\\p{L}* (?:meg |ifra om |fra om )?fravær'),
  word('(?:trenger|ber om|søker om|må ha|kan jeg få) fri'),
  word('permisjon'),
];

const APPOINTMENT_PLACE = word(
  'lege|legen|legetime|legevakt\\p{L}*|fastlegen|tannlege\\p{L}*|tannregulering\\p{L}*|kjeveortoped\\p{L}*|fysioterapeut\\p{L}*|fysio|psykolog\\p{L}*|bup|sykehus\\p{L}*|helsesykepleier\\p{L}*|helsesøster|optiker\\p{L}*|øyelege\\p{L}*|operasjon|røntgen|blodprøve',
);
const APPOINTMENT_CONTEXT = word(
  'skal|må|har|fått|\\p{L}+time\\p{L}*|time hos|time på|time til|avtale|kontroll|er hos|er på',
);
const DENTAL = word('tannlege\\p{L}*|tannregulering\\p{L}*|kjeveortoped\\p{L}*');
const DOCTOR = word('lege|legen|legetime|fastlegen|legevakt\\p{L}*');

const FAMILY_STRONG = word('begravelse\\p{L}*|bisettelse\\p{L}*|dødsfall');
const FAMILY_EVENT = word(
  'bryllup\\p{L}*|konfirmasjon\\p{L}*|barnedåp\\p{L}*|i familien|familiegreier|familieting|familiesammenkomst',
);
const GOING_TO = word('skal (?:i|på|til)|må (?:i|på|til)');

const TRANSPORT = word('buss\\p{L}*|trikk\\p{L}*|tog\\p{L}*|t-bane\\p{L}*|bane\\p{L}*|ferg\\p{L}*|båt\\p{L}*');
const TRANSPORT_STOPPED = word('innstilt\\p{L}*|kansellert\\p{L}*|streik\\p{L}*|går ikke|står stille');
const OVERSLEPT = word('forsov\\p{L}*');

/** The student says the absence is over. */
const RECOVERED = word('ikke(?: lenger)? (?:syk|sjuk|dårlig)|frisk igjen|friskmeldt|er frisk|føler meg (?:mye )?bedre');
const COMING_ANYWAY = word('kommer (?:likevel|uansett|selv om|på skolen|til timen|tilbake)');
/** The message is about an absence that is already over. */
const PAST = word(
  `var${filler(2)} (?:syk|sjuk|borte|dårlig|hos|på)|har vært (?:syk|sjuk|borte)|i går|forrige uke|sist uke|i forrige|da jeg var`,
);
const PRESENT_OR_FUTURE = word(
  `i dag|idag|i morgen|imorgen|i morra|i overmorgen|fortsatt|fremdeles|ennå|enda|${WEEKDAYS_NB.join('|')}`,
);
/** Questions about rules rather than a report: "Hva skjer hvis jeg blir syk?" */
const HYPOTHETICAL = word('hvis jeg|dersom jeg|om jeg (?:blir|er)|hvor mye fravær|hvordan melder|hva er reglene');

const WEEKDAY_PATTERN = WEEKDAYS_NB.join('|');
const weekdayFromName = (name: string) => WEEKDAYS_NB.indexOf(name as (typeof WEEKDAYS_NB)[number]);

function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .replace(/["«»“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The next date after `today` that falls on `weekday` (0 = Monday). */
function nextWeekday(today: ISODate, weekday: number): ISODate {
  const delta = (weekday - weekdayIndex(today) + 7) % 7;
  // Someone who means today says "i dag", so the same weekday means next week.
  return addDays(today, delta === 0 ? 7 : delta);
}

function addExplicitDate(dates: Set<ISODate>, today: ISODate, day: number, month: number): void {
  const year = Number(today.slice(0, 4));
  const pad = (value: number) => String(value).padStart(2, '0');
  let candidate = `${year}-${pad(month)}-${pad(day)}`;
  if (!isValidISODate(candidate)) return;
  // A date that passed a while ago most likely means next year ("3. januar" said in December).
  if (candidate < addDays(today, -7)) candidate = `${year + 1}-${pad(month)}-${pad(day)}`;
  if (isValidISODate(candidate)) dates.add(candidate);
}

/** Resolves "i dag", "i morgen", weekday names, ranges and explicit dates. Defaults to today. */
export function extractDates(text: string, today: ISODate): ISODate[] {
  const dates = new Set<ISODate>();

  if (word('i dag|idag').test(text)) dates.add(today);
  if (word('i morgen|imorgen|i morra').test(text)) dates.add(addDays(today, 1));
  if (word('i overmorgen').test(text)) dates.add(addDays(today, 2));

  for (const match of text.matchAll(new RegExp(`(?<!\\p{L})(${WEEKDAY_PATTERN})(?!\\p{L})`, 'gu'))) {
    dates.add(nextWeekday(today, weekdayFromName(match[1])));
  }

  // "17. november", "17. nov"
  for (const match of text.matchAll(/(?<!\d)(\d{1,2})\.? (\p{L}{3,9})/gu)) {
    const month = monthIndexNb(match[2]);
    if (month >= 0) addExplicitDate(dates, today, Number(match[1]), month + 1);
  }
  // "17.11" or "17/11" (but not a clock time such as 08.15 followed by more digits)
  for (const match of text.matchAll(/(?<![\d.:]|kl\.? ?|klokka |klokken )(\d{1,2})[./](\d{1,2})(?![\d:])/g)) {
    addExplicitDate(dates, today, Number(match[1]), Number(match[2]));
  }

  // "fra mandag til onsdag", "i dag til og med torsdag"
  const rangeEnd = new RegExp(`(?:til og med|t\\.o\\.m\\.?|tom|til|–|-) ?(${WEEKDAY_PATTERN})(?!\\p{L})`, 'u').exec(text);
  if (rangeEnd && dates.size > 0) {
    const start = [...dates].sort()[0];
    const end = nextWeekday(today, weekdayFromName(rangeEnd[1]));
    for (const day of schoolDaysBetween(start, end)) dates.add(day);
  }
  // "resten av uka", "ut uken", "hele uka"
  if (word('resten av uk[ae]n?|ut uk[ae]n?|hele uk[ae]n?').test(text)) {
    const start = dates.size > 0 ? [...dates].sort()[0] : today;
    const friday = addDays(start, Math.max(0, 4 - weekdayIndex(start)));
    for (const day of schoolDaysBetween(start, friday)) dates.add(day);
  }

  if (dates.size === 0) dates.add(today);
  return [...dates].sort();
}

/** "første time", "de to første timene", "siste time" → the subjects of those classes. */
function classesByPosition(
  text: string,
  dates: ISODate[],
  upcomingClasses: AbsenceDetectRequest['upcomingClasses'],
): string[] {
  const first = word('(to )?første time\\p{L}*').exec(text);
  const last = word('(to )?siste time\\p{L}*').exec(text);
  if (!first && !last) return [];

  const subjects = new Set<string>();
  for (const date of dates) {
    const day = upcomingClasses
      .filter((item) => item.date === date)
      .sort((a, b) => a.start.localeCompare(b.start));
    if (first) day.slice(0, first[1] ? 2 : 1).forEach((item) => subjects.add(item.subject));
    if (last) day.slice(last[1] ? -2 : -1).forEach((item) => subjects.add(item.subject));
  }
  return [...subjects];
}

const NO_ABSENCE: RawDetection = {
  isAbsence: false,
  dates: [],
  classes: [],
  wholeDay: false,
  reason: null,
  reasonText: null,
};

export function detectAbsenceHeuristic(request: AbsenceDetectRequest): RawDetection {
  const text = normalizeMessage(request.message);
  const wordCount = text.split(' ').length;

  const cantCome = CANT_COME.some((pattern) => pattern.test(text));
  const appointment = APPOINTMENT_PLACE.test(text) && APPOINTMENT_CONTEXT.test(text);
  const sick =
    SICK_STATEMENT.test(text) ||
    SICK_WITH_CAUSE.test(text) ||
    // A bare "syk" or "feber" only counts in a short note ("Syk i dag.") or next to "kommer ikke".
    ((SICK_BARE.test(text) || SICK_NOUN.test(text)) && (cantCome || wordCount <= 6));
  const family = FAMILY_STRONG.test(text) || (FAMILY_EVENT.test(text) && (cantCome || GOING_TO.test(text)));
  const transport = TRANSPORT.test(text) && (TRANSPORT_STOPPED.test(text) || cantCome);
  const overslept = OVERSLEPT.test(text);

  if (!(cantCome || appointment || sick || family || transport || overslept)) return NO_ABSENCE;

  // Guards: rule questions, "I was ill last week", "I am well again".
  if (HYPOTHETICAL.test(text)) return NO_ABSENCE;
  if (PAST.test(text) && !PRESENT_OR_FUTURE.test(text) && !cantCome) return NO_ABSENCE;
  if ((RECOVERED.test(text) || COMING_ANYWAY.test(text)) && !cantCome) return NO_ABSENCE;

  const dates = extractDates(text, request.today);
  const classes = [
    ...new Set([
      ...findMentionedSubjects(text, request.upcomingClasses),
      ...classesByPosition(text, dates, request.upcomingClasses),
    ]),
  ];

  let reason: RawDetection['reason'] = 'annet';
  let reasonText: string | null = null;
  if (appointment) {
    reason = 'lege_tannlege';
    reasonText = DENTAL.test(text) ? 'Tannlegetime' : DOCTOR.test(text) ? 'Legetime' : 'Time hos behandler';
  } else if (sick) {
    reason = 'sykdom';
    reasonText = 'Syk';
  } else if (family) {
    reason = 'familie';
    reasonText = FAMILY_STRONG.test(text) ? 'Begravelse' : 'Familie';
  } else if (transport) {
    reason = 'transport';
    reasonText = 'Problemer med transport';
  } else if (overslept) {
    reasonText = 'Forsovet';
  }

  return { isAbsence: true, dates, classes, wholeDay: classes.length === 0, reason, reasonText };
}
