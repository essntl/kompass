import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiErrorBody, ApiErrorCode } from '../../shared/api';

/** An error with an HTTP status and a Norwegian message that is safe to show to the user. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export const MESSAGES = {
  badRequest: 'Forespørselen mangler noe eller har feil format.',
  tooLarge: 'Det du sendte, er for stort. Prøv med et mindre bilde.',
  notFound: 'Fant ikke det du lette etter.',
  internal: 'Noe gikk galt hos oss. Prøv igjen om litt.',
  aiGeneric: 'AI-hjelperen svarte ikke som den skulle. Prøv igjen om litt.',
  aiRateLimited: 'Det er mange som bruker AI-hjelperen akkurat nå. Vent litt og prøv igjen.',
  aiAuth: 'AI-hjelperen er ikke riktig satt opp. Si fra til den som drifter appen.',
  aiTimeout: 'AI-hjelperen brukte for lang tid. Prøv igjen.',
  aiRefusal: 'Dette kan jeg dessverre ikke hjelpe med. Prøv å spørre på en annen måte.',
  aiEmpty: 'AI-hjelperen ga et tomt svar. Prøv igjen.',
  notPdf: 'Filen er ikke en PDF. Lagre timeplanen som PDF fra Visma InSchool og prøv igjen.',
  pdfTooLarge: 'PDF-en er for stor. Den kan være på opptil 5 MB.',
  notTimetable: 'Vi fant ingen timeplan i PDF-en. Prøv å lagre timeplanen på nytt fra Visma InSchool.',
  enturUnavailable: 'Fikk ikke kontakt med reiseplanleggeren (Entur). Prøv igjen om litt.',
} as const;

export function errorBody(code: ApiErrorCode, message: string): ApiErrorBody {
  return { error: { code, message } };
}

/** Converts anything thrown into an HttpError. Unknown errors become a generic 500. */
export function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;

  // Errors raised by express.json() / body-parser carry a `type` and a `status`.
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = String((err as { type: unknown }).type);
    if (type === 'entity.too.large') {
      return new HttpError(413, 'BAD_REQUEST', MESSAGES.tooLarge, { cause: err });
    }
    if (type.startsWith('entity.') || type.startsWith('request.') || type === 'encoding.unsupported') {
      return new HttpError(400, 'BAD_REQUEST', MESSAGES.badRequest, { cause: err });
    }
  }

  return new HttpError(500, 'INTERNAL', MESSAGES.internal, { cause: err });
}

/** JSON 404 for unknown /api routes. */
export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json(errorBody('NOT_FOUND', MESSAGES.notFound));
};

/** Final error middleware: always answers `{ error: { code, message } }`. */
export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  const httpError = toHttpError(err);
  if (httpError.status >= 500) {
    console.error(`[api] ${req.method} ${req.originalUrl} -> ${httpError.status} ${httpError.code}`, httpError.cause ?? httpError);
  }
  if (res.headersSent) {
    // A streaming response already started; the route is responsible for the `error` event.
    next(err);
    return;
  }
  res.status(httpError.status).json(errorBody(httpError.code, httpError.message));
};
