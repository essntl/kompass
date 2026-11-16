/**
 * Request/response shapes for every backend route.
 * The server implements them; the client calls them through src/lib/api.ts.
 * Owned by the orchestrator – see docs/contracts.md.
 */
import type {
  AbsenceReason,
  CompetenceDescription,
  ISODate,
  ISOInstant,
  Place,
  RecommendedSource,
  TripPattern,
} from './types';

// ---------------------------------------------------------------- errors

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'AI_UNAVAILABLE'
  | 'AI_ERROR'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'NETWORK'
  | 'NOT_FOUND'
  | 'INTERNAL';

/** Every non-2xx JSON response has this body. `message` is Norwegian and safe to show. */
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

// ---------------------------------------------------------------- GET /api/health

export interface HealthResponse {
  ok: true;
  /** 'live' when ANTHROPIC_API_KEY is set, otherwise 'mock'. */
  ai: 'live' | 'mock';
  model: string;
}

// ---------------------------------------------------------------- POST /api/ai/absence-detect

export interface AbsenceDetectRequest {
  message: string;
  /** The student's "today", so the model can resolve "i morgen", "på fredag". */
  today: ISODate;
  /** Classes for the next ~10 days, so the model can map "norsktimen" to real classes. */
  upcomingClasses: Array<{
    eventId: string;
    date: ISODate;
    subject: string;
    start: string; // HH:mm
    end: string; // HH:mm
  }>;
}

export interface AbsenceDetectResponse {
  isAbsence: boolean;
  dates: ISODate[];
  /** Subject names mentioned; empty when the whole day is meant. */
  classes: string[];
  /** Event ids from `upcomingClasses` that match `classes` on `dates`. */
  classEventIds: string[];
  wholeDay: boolean;
  reason: AbsenceReason | null;
  /** Short Norwegian phrase describing the reason, e.g. "Syk". */
  reasonText: string | null;
  mock: boolean;
}

// ---------------------------------------------------------------- POST /api/ai/info  (SSE)

export interface InfoAskRequest {
  question: string;
  /** Earlier turns in this session, oldest first (max ~6). */
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

// ---------------------------------------------------------------- POST /api/ai/portfolio/describe

export interface PortfolioDescribeRequest {
  title: string;
  note: string;
  subject?: string;
  programme: string;
  year: string;
  image?: {
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    /** Base64 without the data: prefix. The client downsizes to max 1280px first. */
    data: string;
  };
}

export interface PortfolioDescribeResponse {
  competence: CompetenceDescription;
}

// ---------------------------------------------------------------- POST /api/ai/application-text  (SSE)

export interface ApplicationTextRequest {
  student: { name: string; year: string; programme: string };
  /** Omitted for a general application text written from the portfolio page. */
  listing?: {
    company: string;
    trade: string;
    title: string;
    summary: string;
    requirements: string[];
  };
  entries: Array<{
    title: string;
    note: string;
    date: ISODate;
    summary?: string;
    skills?: string[];
  }>;
}

// ---------------------------------------------------------------- SSE events (info + application-text)

/**
 * Both streaming routes answer with `text/event-stream`. Each event is
 * `event: <type>\ndata: <json>\n\n` with these payloads:
 */
export type StreamEvent =
  | { type: 'delta'; text: string }
  /** Only sent by /api/ai/info, once, after the answer text. */
  | { type: 'sources'; sources: RecommendedSource[] }
  | { type: 'done'; mock: boolean }
  | { type: 'error'; code: ApiErrorCode; message: string };

// ---------------------------------------------------------------- GET /api/entur/geocode?q=&lat=&lon=

export interface GeocodeFeature extends Place {
  id: string;
  /** e.g. "Kabelgata 10". */
  name: string;
  /** e.g. "Oslo". */
  locality?: string;
  county?: string;
  /** 'address' | 'venue' (stop place / POI) | 'street' | other Pelias layers. */
  layer: string;
}

export interface GeocodeResponse {
  features: GeocodeFeature[];
}

// ---------------------------------------------------------------- POST /api/entur/trips

export interface TripsRequest {
  from: Place;
  to: Place;
  /** ISO instant with offset. Departure time, or arrival time when `arriveBy` is true. */
  dateTime: ISOInstant;
  arriveBy: boolean;
  /** Metres per second, passed to Entur's walkSpeed. */
  walkSpeed: number;
  /** Default 6. */
  numTripPatterns?: number;
}

export interface TripsResponse {
  patterns: TripPattern[];
  /** When the server fetched (or cached) the result. */
  fetchedAt: ISOInstant;
}
