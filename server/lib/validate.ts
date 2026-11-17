import { z } from 'zod';
import type {
  AbsenceDetectRequest,
  ApplicationTextRequest,
  InfoAskRequest,
  PortfolioDescribeRequest,
  TimetablePdfRequest,
  TripsRequest,
} from '../../shared/api';
import { isValidISODate } from './dates';
import { HttpError, MESSAGES } from './errors';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
const shortText = (max: number) => z.string().trim().min(1).max(max);

const place = z.object({
  label: z.string().max(200),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const absenceDetectSchema = z.object({
  message: shortText(2000),
  today: isoDate,
  upcomingClasses: z
    .array(
      z.object({
        eventId: z.string().min(1).max(100),
        date: isoDate,
        subject: z.string().min(1).max(120),
        start: hhmm,
        end: hhmm,
      }),
    )
    .max(200),
}) satisfies z.ZodType<AbsenceDetectRequest>;

export const infoAskSchema = z.object({
  question: shortText(1000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(6000) }))
    .max(20)
    .optional(),
}) satisfies z.ZodType<InfoAskRequest>;

/** ~6 MB of base64 (≈4.5 MB binary). The client downsizes to max 1280 px first. */
const MAX_IMAGE_BASE64_CHARS = 6_000_000;

export const portfolioDescribeSchema = z.object({
  title: shortText(200),
  note: z.string().max(4000),
  subject: z.string().max(120).optional(),
  programme: z.string().max(120),
  year: z.string().max(20),
  image: z
    .object({
      mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
      data: z
        .string()
        .min(1)
        .max(MAX_IMAGE_BASE64_CHARS)
        .regex(/^[A-Za-z0-9+/]+={0,2}$/),
    })
    .optional(),
}) satisfies z.ZodType<PortfolioDescribeRequest>;

/**
 * A 5 MB PDF is ≈6.67 M base64 characters; the cap leaves a little slack and stays under
 * the server's 8 MB JSON body limit. The decoded size and the `%PDF` header are checked by
 * `decodePdf` in lib/timetable.ts.
 */
export const MAX_PDF_BASE64_CHARS = 7_000_000;

export const timetablePdfSchema = z.object({
  pdf: z
    .string()
    .min(8)
    .max(MAX_PDF_BASE64_CHARS)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  fileName: z.string().max(255).optional(),
  today: isoDate.refine(isValidISODate),
}) satisfies z.ZodType<TimetablePdfRequest>;

export const applicationTextSchema = z.object({
  student: z.object({
    name: shortText(120),
    year: z.string().max(20),
    programme: z.string().max(120),
  }),
  listing: z
    .object({
      company: z.string().max(200),
      trade: z.string().max(200),
      title: z.string().max(300),
      summary: z.string().max(2000),
      requirements: z.array(z.string().max(500)).max(30),
    })
    .optional(),
  entries: z
    .array(
      z.object({
        title: z.string().max(200),
        note: z.string().max(4000),
        date: isoDate,
        summary: z.string().max(2000).optional(),
        skills: z.array(z.string().max(200)).max(20).optional(),
      }),
    )
    .max(30),
}) satisfies z.ZodType<ApplicationTextRequest>;

export const tripsSchema = z.object({
  from: place,
  to: place,
  dateTime: z.string().refine((value) => !Number.isNaN(Date.parse(value)) && /T\d{2}:\d{2}/.test(value)),
  arriveBy: z.boolean(),
  walkSpeed: z.number().positive().max(5),
  numTripPatterns: z.number().int().min(1).max(12).optional(),
}) satisfies z.ZodType<TripsRequest>;

export const geocodeQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

/** Parses `input` with `schema` or throws a 400 BAD_REQUEST with a Norwegian message. */
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')).filter(Boolean))];
  const detail = fields.length > 0 ? ` Sjekk feltet: ${fields.slice(0, 3).join(', ')}.` : '';
  throw new HttpError(400, 'BAD_REQUEST', `${MESSAGES.badRequest}${detail}`, { cause: result.error });
}
