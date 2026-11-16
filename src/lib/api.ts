/**
 * Typed client for every backend route (see docs/contracts.md §8 and shared/api.ts).
 *
 * All functions throw `ApiError` with a Norwegian `message` that is safe to show:
 * - `code: 'NETWORK'` when the server cannot be reached,
 * - otherwise the code and message from the server's `{ error: { code, message } }` body.
 *
 * Aborting through an `AbortSignal` is not an error to show: the functions then reject
 * with the browser's `AbortError`, which `isAbortError()` recognises.
 */
import type {
  AbsenceDetectRequest,
  AbsenceDetectResponse,
  ApiErrorBody,
  ApiErrorCode,
  ApplicationTextRequest,
  GeocodeResponse,
  HealthResponse,
  InfoAskRequest,
  PortfolioDescribeRequest,
  PortfolioDescribeResponse,
  StreamEvent,
  TripsRequest,
  TripsResponse,
} from '@shared/api';
import type { RecommendedSource } from '@shared/types';
import { readSseStream } from './sse';

const API_BASE = '/api';

const MESSAGES = {
  network: 'Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.',
  unexpected: 'Noe gikk galt. Prøv igjen om litt.',
  streamInterrupted: 'Svaret ble avbrutt før det var ferdig. Prøv igjen.',
} as const;

const ERROR_CODES: readonly ApiErrorCode[] = [
  'BAD_REQUEST',
  'AI_UNAVAILABLE',
  'AI_ERROR',
  'RATE_LIMITED',
  'UPSTREAM_ERROR',
  'NETWORK',
  'NOT_FOUND',
  'INTERNAL',
];

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** HTTP status when the server answered; undefined for network errors and stream errors. */
  readonly status?: number;

  constructor(code: ApiErrorCode, message: string, status?: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** True when a request was cancelled through its `AbortSignal`. */
export function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError';
}

export interface RequestOptions {
  signal?: AbortSignal;
}

function fallbackCode(status: number): ApiErrorCode {
  if (status === 400 || status === 413 || status === 422) return 'BAD_REQUEST';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  // Our server always answers errors as JSON, so a 5xx without that body comes from a
  // proxy in front of it (for example the Vite dev proxy while the API server is down).
  if (status >= 500) return 'NETWORK';
  return 'INTERNAL';
}

/** Builds an `ApiError` from a non-2xx response, using the server's error body when present. */
async function errorFromResponse(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON (for example a proxy error page): fall through to the generic message.
  }
  const error = (body as Partial<ApiErrorBody> | null)?.error;
  if (error && typeof error.message === 'string' && ERROR_CODES.includes(error.code as ApiErrorCode)) {
    return new ApiError(error.code as ApiErrorCode, error.message, response.status);
  }
  const code = fallbackCode(response.status);
  return new ApiError(code, code === 'NETWORK' ? MESSAGES.network : MESSAGES.unexpected, response.status);
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError('NETWORK', MESSAGES.network, undefined, { cause: err });
  }
  if (!response.ok) throw await errorFromResponse(response);
  return response;
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError('INTERNAL', MESSAGES.unexpected, response.status, { cause: err });
  }
}

async function getJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, { headers: { Accept: 'application/json' }, signal: options.signal });
  return readJson<T>(response);
}

function postInit(body: unknown, accept: string, signal?: AbortSignal): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: accept },
    body: JSON.stringify(body),
    signal,
  };
}

async function postJson<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, postInit(body, 'application/json', options.signal));
  return readJson<T>(response);
}

// ---------------------------------------------------------------- streaming

export interface StreamHandlers {
  /** Called for every piece of answer text, in order. */
  onDelta: (text: string) => void;
  /** Called once, after the answer text (info corner only). */
  onSources?: (sources: RecommendedSource[]) => void;
  signal?: AbortSignal;
}

export interface StreamResult {
  /** True when the answer came from the server's mock mode. */
  mock: boolean;
}

function parseStreamEvent(data: string): StreamEvent | null {
  try {
    const event = JSON.parse(data) as StreamEvent;
    return event && typeof event === 'object' && typeof event.type === 'string' ? event : null;
  } catch {
    return null;
  }
}

/**
 * POSTs `body` and reads the SSE answer. Resolves when the `done` event arrives; rejects
 * with `ApiError` on an `error` event, a non-2xx answer or a stream that ends early.
 */
async function postStream(path: string, body: unknown, handlers: StreamHandlers): Promise<StreamResult> {
  const response = await send(path, postInit(body, 'text/event-stream', handlers.signal));
  if (!response.body) throw new ApiError('INTERNAL', MESSAGES.unexpected, response.status);

  // Kept in an object: the callback below assigns them, which TypeScript cannot follow for plain variables.
  const state: { result: StreamResult | null; failure: ApiError | null } = { result: null, failure: null };

  try {
    await readSseStream(response.body, (message) => {
      if (state.result || state.failure) return;
      const event = parseStreamEvent(message.data);
      if (!event) return;
      switch (event.type) {
        case 'delta':
          handlers.onDelta(event.text);
          break;
        case 'sources':
          handlers.onSources?.(event.sources);
          break;
        case 'done':
          state.result = { mock: event.mock };
          break;
        case 'error':
          state.failure = new ApiError(event.code, event.message);
          break;
      }
    });
  } catch (err) {
    if (isAbortError(err) || handlers.signal?.aborted) {
      throw isAbortError(err) ? err : new DOMException('The request was aborted.', 'AbortError');
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError('NETWORK', MESSAGES.network, undefined, { cause: err });
  }

  if (state.failure) throw state.failure;
  if (!state.result) throw new ApiError('AI_ERROR', MESSAGES.streamInterrupted);
  return state.result;
}

// ---------------------------------------------------------------- routes

/** GET /api/health */
export function getHealth(options?: RequestOptions): Promise<HealthResponse> {
  return getJson<HealthResponse>('/health', options);
}

/** POST /api/ai/absence-detect */
export function detectAbsence(request: AbsenceDetectRequest, options?: RequestOptions): Promise<AbsenceDetectResponse> {
  return postJson<AbsenceDetectResponse>('/ai/absence-detect', request, options);
}

/** POST /api/ai/info – streams the answer; `onSources` fires once after the text. */
export function streamInfoAnswer(request: InfoAskRequest, handlers: StreamHandlers): Promise<StreamResult> {
  return postStream('/ai/info', request, handlers);
}

/** POST /api/ai/portfolio/describe */
export function describePortfolioEntry(
  request: PortfolioDescribeRequest,
  options?: RequestOptions,
): Promise<PortfolioDescribeResponse> {
  return postJson<PortfolioDescribeResponse>('/ai/portfolio/describe', request, options);
}

/** POST /api/ai/application-text – streams the draft. */
export function streamApplicationText(
  request: ApplicationTextRequest,
  handlers: Omit<StreamHandlers, 'onSources'>,
): Promise<StreamResult> {
  return postStream('/ai/application-text', request, handlers);
}

export interface GeocodeOptions extends RequestOptions {
  /** Bias results towards this point (for example the school). */
  lat?: number;
  lon?: number;
}

/** GET /api/entur/geocode?q=&lat=&lon= – fewer than two characters returns no features. */
export function geocode(q: string, options: GeocodeOptions = {}): Promise<GeocodeResponse> {
  const params = new URLSearchParams({ q });
  if (typeof options.lat === 'number' && typeof options.lon === 'number') {
    params.set('lat', String(options.lat));
    params.set('lon', String(options.lon));
  }
  return getJson<GeocodeResponse>(`/entur/geocode?${params}`, options);
}

/** POST /api/entur/trips – no trips found is a normal answer with `patterns: []`. */
export function planTrips(request: TripsRequest, options?: RequestOptions): Promise<TripsResponse> {
  return postJson<TripsResponse>('/entur/trips', request, options);
}
