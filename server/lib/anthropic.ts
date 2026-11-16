/**
 * Anthropic client factory, per-route request settings and error mapping.
 *
 * Model notes (Claude Haiku 5.5): thinking is adaptive and on by default, so responses
 * can start with `thinking` blocks – always read content blocks by type. `effort` is the
 * lever for speed; these are short, latency-sensitive calls, so they run at `low` (the
 * info answer at `medium`, where following the "always recommend sources" rule matters).
 * Thinking counts toward `max_tokens`, so the caps below leave room for it. Sampling
 * parameters (`temperature` etc.) and assistant prefill are rejected by this model, and
 * there is no server-side refusal fallback: a `refusal` stop reason is handled here.
 */
import Anthropic from '@anthropic-ai/sdk';
import { getApiKey, getModel } from '../config';
import { HttpError, MESSAGES } from './errors';

const REQUEST_TIMEOUT_MS = 45_000;

let cached: { key: string; client: Anthropic } | null = null;

/** The shared client, or `null` in mock mode (no API key). */
export function getAnthropicClient(): Anthropic | null {
  const key = getApiKey();
  if (!key) return null;
  if (cached?.key !== key) {
    cached = { key, client: new Anthropic({ apiKey: key, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 }) };
  }
  return cached.client;
}

type Effort = NonNullable<Anthropic.OutputConfig['effort']>;

interface RouteSettings {
  maxTokens: number;
  effort: Effort;
}

/** Tweak speed/quality per feature here. */
export const AI_SETTINGS = {
  absenceDetect: { maxTokens: 2000, effort: 'low' },
  info: { maxTokens: 3000, effort: 'medium' },
  portfolioDescribe: { maxTokens: 3000, effort: 'low' },
  applicationText: { maxTokens: 2500, effort: 'low' },
} as const satisfies Record<string, RouteSettings>;

/** Common request fields for a route: model, token cap, adaptive thinking and effort. */
export function baseParams(settings: RouteSettings) {
  return {
    model: getModel(),
    max_tokens: settings.maxTokens,
    thinking: { type: 'adaptive' },
  } as const satisfies Partial<Anthropic.MessageCreateParamsNonStreaming>;
}

/** Thrown when the model stops with `stop_reason: "refusal"`. */
export class AiRefusalError extends Error {
  constructor(readonly category: string | null = null) {
    super(`The model declined the request (category: ${category ?? 'unknown'})`);
    this.name = 'AiRefusalError';
  }
}

/**
 * Checks the stop reason before any content is read. A refusal becomes an
 * `AiRefusalError`; everything else is returned to the caller to judge.
 */
export function assertNotRefused(message: Pick<Anthropic.Message, 'stop_reason' | 'stop_details'>): void {
  if (message.stop_reason === 'refusal') {
    throw new AiRefusalError(message.stop_details?.category ?? null);
  }
}

/** Joins the text blocks of a message (thinking and tool blocks are skipped). */
export function textOf(message: Pick<Anthropic.Message, 'content'>): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/** Maps anything thrown by an AI call to an HttpError with a friendly Norwegian message. */
export function mapAiError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  if (err instanceof AiRefusalError) {
    return new HttpError(422, 'AI_ERROR', MESSAGES.aiRefusal, { cause: err });
  }
  // Most specific first: the SDK's classes form a hierarchy under APIError.
  if (err instanceof Anthropic.RateLimitError) {
    return new HttpError(429, 'RATE_LIMITED', MESSAGES.aiRateLimited, { cause: err });
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new HttpError(502, 'AI_ERROR', MESSAGES.aiAuth, { cause: err });
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return new HttpError(504, 'AI_ERROR', MESSAGES.aiTimeout, { cause: err });
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new HttpError(502, 'AI_ERROR', MESSAGES.aiGeneric, { cause: err });
  }
  if (err instanceof Anthropic.APIError) {
    // 400/404/413 (our request was wrong), 5xx and 529 (their side): same message for the user.
    return new HttpError(502, 'AI_ERROR', MESSAGES.aiGeneric, { cause: err });
  }
  return new HttpError(502, 'AI_ERROR', MESSAGES.aiGeneric, { cause: err });
}

/** True when the request was aborted because the browser went away. */
export function isAbortError(err: unknown): boolean {
  return err instanceof Anthropic.APIUserAbortError || (err instanceof Error && err.name === 'AbortError');
}
