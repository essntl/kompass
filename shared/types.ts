/**
 * Shared domain types for Kompass.
 * Imported by both the client (`@shared/types`) and the server.
 * This file is owned by the orchestrator: do not change existing fields without
 * updating docs/contracts.md. Adding optional fields is fine.
 */

/** Calendar date without time, local: `YYYY-MM-DD`. */
export type ISODate = string;
/** Local date-time without offset: `YYYY-MM-DDTHH:mm` (Europe/Oslo wall time). */
export type LocalDateTime = string;
/** Full ISO 8601 instant with offset or Z, as returned by Entur and `Date#toISOString`. */
export type ISOInstant = string;

// ---------------------------------------------------------------- places

export interface Place {
  /** Human readable, e.g. "Kabelgata 10, Oslo". */
  label: string;
  lat: number;
  lon: number;
}

// ---------------------------------------------------------------- subjects & teachers

/** Index into the categorical subject palette (`--subj-1` … `--subj-8`). */
export type SubjectColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Subject {
  id: string;
  /** Full name, e.g. "Produksjon og tjenester". */
  name: string;
  /** Short label for tight spaces, e.g. "Prod". */
  short: string;
  color: SubjectColor;
  /** True for programme subjects (programfag), false for common core (fellesfag). */
  vocational: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  /** e.g. "Kontaktlærer", "Faglærer". */
  role: string;
  subjectIds: string[];
  /** Palette index used for the avatar background. */
  color: SubjectColor;
}

// ---------------------------------------------------------------- calendar

export type EventKind = 'class' | 'absence' | 'custom' | 'deadline';
export type EventSource = 'seed' | 'ics' | 'manual' | 'absence' | 'application';

export type AbsenceReason = 'sykdom' | 'lege_tannlege' | 'familie' | 'transport' | 'annet';

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  /** Subject name for classes, free text otherwise. */
  title: string;
  start: LocalDateTime;
  end: LocalDateTime;
  allDay?: boolean;
  subjectId?: string;
  teacherId?: string;
  room?: string;
  /** Only set when the event is NOT at the school. Omitted = at the school address. */
  location?: Place;
  note?: string;
  source: EventSource;
  /** For kind 'absence': the absence record this event belongs to. */
  absenceId?: string;
  /** For kind 'deadline': the listing this deadline belongs to. */
  listingId?: string;
}

export interface AbsenceRecord {
  id: string;
  dates: ISODate[];
  wholeDay: boolean;
  /** Class events covered when `wholeDay` is false. */
  classEventIds: string[];
  reason: AbsenceReason;
  text?: string;
  /** Teachers that were notified. */
  teacherIds: string[];
  createdAt: ISOInstant;
  /** 'form' = the "Meld fravær" flow, 'ai' = confirmed AI suggestion from a chat message. */
  source: 'form' | 'ai';
}

// ---------------------------------------------------------------- messages

export interface Thread {
  id: string;
  teacherId: string;
}

export interface Message {
  id: string;
  threadId: string;
  from: 'student' | 'teacher';
  text: string;
  sentAt: ISOInstant;
  /** Only meaningful for teacher messages. */
  read: boolean;
  /** 'absence' renders as a structured absence-notice bubble. */
  kind: 'text' | 'absence';
  absenceId?: string;
}

// ---------------------------------------------------------------- travel

export type TransportMode =
  | 'foot'
  | 'bus'
  | 'tram'
  | 'metro'
  | 'rail'
  | 'water'
  | 'coach'
  | 'bicycle'
  | 'other';

export interface TripSituation {
  summary: string;
  description?: string;
}

export interface TripLeg {
  mode: TransportMode;
  fromName: string;
  toName: string;
  /** Platform / quay public code where available, e.g. "B" or "2". */
  fromPlatform?: string;
  toPlatform?: string;
  aimedStart: ISOInstant;
  expectedStart: ISOInstant;
  aimedEnd: ISOInstant;
  expectedEnd: ISOInstant;
  /** True when the times are based on real-time data. */
  realtime: boolean;
  /** Metres. */
  distance: number;
  /** Seconds. */
  duration: number;
  line?: {
    /** e.g. "31", "L1", "5". */
    publicCode: string;
    name?: string;
    /** Hex colours from the operator when available (with leading #). */
    color?: string;
    textColor?: string;
  };
  /** Destination display / direction, e.g. "Grorud T". */
  headsign?: string;
  intermediateStops?: number;
  situations: TripSituation[];
}

export interface TripPattern {
  id: string;
  /** Expected (real-time adjusted) start and end of the whole trip. */
  startTime: ISOInstant;
  endTime: ISOInstant;
  /** Seconds. */
  duration: number;
  /** Metres walked in total. */
  walkDistance: number;
  legs: TripLeg[];
}

export type TripPurpose = 'to_school' | 'home' | 'between';

/**
 * - in_window: arrives 10–15 min before the target.
 * - early:     arrives more than 15 min before (closest non-late option).
 * - tight:     arrives less than 10 min before but not late.
 * - late:      every option arrives after the target.
 * - none:      no trip found.
 */
export type TripFit = 'in_window' | 'early' | 'tight' | 'late' | 'none';

export interface PlannedTrip {
  purpose: TripPurpose;
  from: Place;
  to: Place;
  /** to_school/between: the class start. home: the end of the last class. */
  targetTime: LocalDateTime;
  /** The event the trip was planned for. */
  eventId?: string;
  pattern: TripPattern | null;
  alternatives: TripPattern[];
  fit: TripFit;
  /** Minutes between arrival and target (to_school/between). Negative = late. */
  minutesEarly?: number;
  /** Norwegian, user-facing. Set when `fit` is not 'in_window'. */
  warning?: string;
}

export type WalkPreset = 'rolig' | 'normal' | 'rask' | 'custom';

// ---------------------------------------------------------------- settings

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  /** lucide icon name in kebab-case, e.g. "mail". Falls back to a link icon. */
  icon?: string;
}

export interface StudentProfile {
  name: string;
  /** e.g. "Vg1". */
  year: string;
  /** Education programme, e.g. "Teknologi- og industrifag". */
  programme: string;
}

// ---------------------------------------------------------------- portfolio

export interface SuggestedGoal {
  /** A competence goal paraphrased from the curriculum. Always shown as a suggestion. */
  text: string;
  /** One line on why this entry might relate to it. */
  why: string;
}

export interface CompetenceDescription {
  /** 1–2 sentence summary. */
  summary: string;
  /** What was done, plain language. */
  whatWasDone: string;
  skills: string[];
  suggestedGoals: SuggestedGoal[];
  generatedAt: ISOInstant;
  /** True when produced by the server's mock mode. */
  mock: boolean;
}

export interface PortfolioEntry {
  id: string;
  title: string;
  note: string;
  /** When the work was done. */
  date: ISODate;
  subjectId?: string;
  /**
   * Where the photo lives:
   * - `asset:<path>` → bundled seed image under /public (e.g. "asset:/seed/portfolio/weld.svg")
   * - `idb:<key>`    → user photo stored in IndexedDB (see src/lib/photos.ts)
   */
  photo?: string;
  tags: string[];
  competence?: CompetenceDescription;
  createdAt: ISOInstant;
}

// ---------------------------------------------------------------- apprenticeships

export interface Listing {
  id: string;
  /** Fictional company name. */
  company: string;
  /** The trade (lærefag), e.g. "Industrimekaniker". */
  trade: string;
  /** Education programme the trade belongs to. */
  programme: string;
  /** Short headline for the listing card. */
  title: string;
  /** Town / municipality, e.g. "Drammen". */
  location: string;
  county: string;
  deadline: ISODate;
  /** Number of apprentices wanted. */
  positions: number;
  startDate: ISODate;
  postedAt: ISODate;
  /** 1–2 sentences for the card. */
  summary: string;
  /** Longer body text for the detail page (plain paragraphs separated by \n\n). */
  description: string;
  tasks: string[];
  requirements: string[];
  offers: string[];
  contactName: string;
  contactRole: string;
  logo: { initials: string; color: SubjectColor };
}

export interface Application {
  id: string;
  listingId: string;
  entryIds: string[];
  text: string;
  submittedAt: ISOInstant;
}

// ---------------------------------------------------------------- assessments

/** The Norwegian grade scale. */
export type Grade = 1 | 2 | 3 | 4 | 5 | 6;

/** Prøve, innlevering, muntlig presentasjon, praktisk arbeid, fagsamtale. */
export type AssessmentKind = 'prove' | 'innlevering' | 'muntlig' | 'praktisk' | 'fagsamtale';

export interface AssessmentResult {
  /** Omitted for an assessment without a grade ("vurdering uten karakter"). */
  grade?: Grade;
  /** The teacher's feedback: what went well. */
  feedback: string;
  /** "Framovermelding": what to work on next. */
  nextSteps?: string;
  assessedAt: ISODate;
}

export interface Assessment {
  id: string;
  subjectId: string;
  teacherId?: string;
  title: string;
  kind: AssessmentKind;
  /** The day it is held, or the due date of a hand-in. */
  date: ISODate;
  /** `HH:mm`: when it starts, or when a hand-in is due. */
  time?: string;
  /** What it covers and how to prepare. */
  description?: string;
  /** Competence goals it assesses, paraphrased from the curriculum. */
  goals?: string[];
  /** Hand-ins only: the student has marked it as handed in. */
  submitted?: boolean;
  /** Set once the teacher has assessed it. */
  result?: AssessmentResult;
}

// ---------------------------------------------------------------- reminders (derived)

export type ReminderKind = 'deadline' | 'event' | 'message' | 'absence' | 'assessment';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: string;
  detail?: string;
  /** When it is due; used for sorting and the "om 3 dager" label. */
  due?: LocalDateTime | ISODate;
  /** In-app route to open. */
  href: string;
}

// ---------------------------------------------------------------- info corner

export interface InfoSource {
  id: string;
  title: string;
  /** Verified to exist at build time. Never invent URLs. */
  url: string;
  /** Publisher, e.g. "Utdanningsdirektoratet". */
  publisher: string;
  /** Short Norwegian summary of what the page covers (sent to the model). */
  summary: string;
  topics: InfoTopicId[];
}

export type InfoTopicId =
  | 'laerling'
  | 'soke'
  | 'opplaeringskontor'
  | 'fagbrev'
  | 'veier'
  | 'rettigheter'
  | 'fravaer'
  | 'okonomi';

export interface RecommendedSource {
  /** Must match an `InfoSource.id`; the server drops anything else. */
  sourceId: string;
  title: string;
  url: string;
  /** One line on why it is relevant to the question. */
  why: string;
}
