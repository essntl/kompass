/**
 * Live-mode implementations of the AI routes (used when ANTHROPIC_API_KEY is set).
 * The client is passed in, so the functions can be tested with a fake.
 *
 * How each route gets structured data:
 * - absence-detect, portfolio/describe and timetable/pdf use structured outputs
 *   (`output_config.format` built with the SDK's `zodOutputFormat`). The stop reason is
 *   checked first, then the JSON is parsed and validated against the same zod schema.
 * - info streams the answer as plain text and gets the sources through the strict
 *   `recommend_sources` tool, which the model calls after the text in the same turn.
 * - application-text is a plain text stream.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import type {
  AbsenceDetectRequest,
  AbsenceDetectResponse,
  ApplicationTextRequest,
  InfoAskRequest,
  PortfolioDescribeRequest,
  PortfolioDescribeResponse,
  TimetablePdfRequest,
} from '../../shared/api';
import { INFO_SOURCES } from '../../shared/infoSources';
import { absenceOutputSchema, buildAbsenceSystemPrompt, buildAbsenceUserPrompt } from '../prompts/absence';
import { buildApplicationSystemPrompt, buildApplicationUserPrompt } from '../prompts/application';
import {
  ANSWER_AFTER_TOOL_MESSAGE,
  buildInfoMessages,
  buildInfoSystemPrompt,
  buildRecommendSourcesTool,
  RECOMMEND_SOURCES_TOOL,
  recommendSourcesInputSchema,
} from '../prompts/info';
import {
  buildPortfolioSystemPrompt,
  buildPortfolioUserPrompt,
  GOALS_RANGE,
  portfolioOutputSchema,
  SKILLS_RANGE,
} from '../prompts/portfolio';
import {
  buildTimetableSystemPrompt,
  buildTimetableUserPrompt,
  timetableOutputSchema,
  type TimetableOutput,
} from '../prompts/timetable';
import { finalizeDetection } from './absence';
import { AI_SETTINGS, assertNotRefused, baseParams, textOf } from './anthropic';
import { HttpError, MESSAGES } from './errors';
import { resolveSources, type SourcePick } from './sources';
import type { SseWriter } from './sse';

const aiError = (reason: string) => new HttpError(502, 'AI_ERROR', MESSAGES.aiGeneric, { cause: new Error(reason) });

/**
 * One structured-output request. Checks `stop_reason` before touching the content: a
 * refusal or a response cut off at `max_tokens` has no valid JSON to read.
 */
async function requestStructured<Schema extends z.ZodType>(
  client: Anthropic,
  schema: Schema,
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'output_config'> & { effort: Anthropic.OutputConfig['effort'] },
  requestOptions?: Anthropic.RequestOptions,
): Promise<z.infer<Schema>> {
  const { effort, ...rest } = params;
  const format = zodOutputFormat(schema);
  const message = await client.messages.create({ ...rest, output_config: { effort, format } }, requestOptions);

  assertNotRefused(message);
  if (message.stop_reason === 'max_tokens') throw aiError('structured output was cut off at max_tokens');

  const text = textOf(message).trim();
  if (!text) throw aiError(`structured output was empty (stop_reason: ${message.stop_reason})`);
  try {
    // `format.parse` runs JSON.parse and validates against the zod schema.
    return format.parse(text);
  } catch (cause) {
    throw new HttpError(502, 'AI_ERROR', MESSAGES.aiGeneric, { cause });
  }
}

// ---------------------------------------------------------------- absence-detect

export async function detectAbsenceLive(client: Anthropic, request: AbsenceDetectRequest): Promise<AbsenceDetectResponse> {
  const settings = AI_SETTINGS.absenceDetect;
  const output = await requestStructured(client, absenceOutputSchema, {
    ...baseParams(settings),
    effort: settings.effort,
    system: buildAbsenceSystemPrompt(),
    messages: [{ role: 'user', content: buildAbsenceUserPrompt(request) }],
  });
  // Dates, subjects and the reason are validated and clamped here, never trusted as-is.
  return finalizeDetection(output, request, false);
}

// ---------------------------------------------------------------- portfolio/describe

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

export async function describePortfolioLive(
  client: Anthropic,
  request: PortfolioDescribeRequest,
): Promise<PortfolioDescribeResponse> {
  const settings = AI_SETTINGS.portfolioDescribe;
  const content: Anthropic.ContentBlockParam[] = [];
  if (request.image) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: request.image.mediaType, data: request.image.data },
    });
  }
  content.push({ type: 'text', text: buildPortfolioUserPrompt(request) });

  const output = await requestStructured(client, portfolioOutputSchema, {
    ...baseParams(settings),
    effort: settings.effort,
    system: buildPortfolioSystemPrompt(),
    messages: [{ role: 'user', content }],
  });

  const skills = [...new Set(output.skills.map(clean).filter(Boolean))].slice(0, SKILLS_RANGE.max);
  const suggestedGoals = output.suggestedGoals
    .map((goal) => ({ text: clean(goal.text), why: clean(goal.why) }))
    .filter((goal) => goal.text)
    .slice(0, GOALS_RANGE.max);
  const summary = clean(output.summary);
  const whatWasDone = clean(output.whatWasDone);
  if (!summary || !whatWasDone || skills.length === 0) throw aiError('competence description is missing required text');

  return {
    competence: { summary, whatWasDone, skills, suggestedGoals, generatedAt: new Date().toISOString(), mock: false },
  };
}

// ---------------------------------------------------------------- timetable/pdf

/** Reading a full-page PDF takes longer than the other routes; this overrides the client default. */
export const TIMETABLE_PDF_TIMEOUT_MS = 90_000;

/**
 * Sends the PDF as a base64 `document` block (before the text, as the API recommends)
 * and returns what the model read. Sanitizing, dates and the .ics are done by the caller
 * (`buildTimetableResponse`), so this stays a thin reading step.
 */
export async function readTimetablePdfLive(
  client: Anthropic,
  request: TimetablePdfRequest,
  signal?: AbortSignal,
): Promise<TimetableOutput> {
  const settings = AI_SETTINGS.timetablePdf;
  return requestStructured(
    client,
    timetableOutputSchema,
    {
      ...baseParams(settings),
      effort: settings.effort,
      system: buildTimetableSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: request.pdf } },
            { type: 'text', text: buildTimetableUserPrompt(request) },
          ],
        },
      ],
    },
    { signal, timeout: TIMETABLE_PDF_TIMEOUT_MS },
  );
}

// ---------------------------------------------------------------- info (SSE)

function extractSourcePicks(message: Anthropic.Message): SourcePick[] | null {
  for (const block of message.content) {
    if (block.type !== 'tool_use' || block.name !== RECOMMEND_SOURCES_TOOL) continue;
    const parsed = recommendSourcesInputSchema.safeParse(block.input);
    if (parsed.success) return parsed.data.sources;
  }
  return null;
}

/**
 * Streams the answer as `delta` events and then sends one `sources` event. The caller
 * sends `done`. Sources are validated against the curated list by `resolveSources`, which
 * also falls back to a keyword match so there is always at least one.
 */
export async function streamInfoLive(
  client: Anthropic,
  request: InfoAskRequest,
  sse: SseWriter,
  signal?: AbortSignal,
): Promise<void> {
  const settings = AI_SETTINGS.info;
  const params = {
    ...baseParams(settings),
    output_config: { effort: settings.effort },
    // Identical for every request, so it is cached (tools render before system and are cached with it).
    system: [
      { type: 'text', text: buildInfoSystemPrompt(INFO_SOURCES), cache_control: { type: 'ephemeral' } },
    ],
    // No `eager_input_streaming`: the input is tiny, and we want the strict schema enforced.
    tools: [buildRecommendSourcesTool(INFO_SOURCES)],
  } satisfies Omit<Anthropic.MessageStreamParams, 'messages'>;

  let messages = buildInfoMessages(request);
  let answer = '';
  let picks: SourcePick[] | null = null;

  // Normally one turn: text, then the tool call. If the model calls the tool before it has
  // written anything, a second turn hands back the tool result and asks for the answer.
  for (let turn = 0; turn < 2; turn += 1) {
    const stream = client.messages.stream({ ...params, messages }, { signal });
    stream.on('text', (delta) => {
      answer += delta;
      sse.send({ type: 'delta', text: delta });
    });
    const message = await stream.finalMessage();
    assertNotRefused(message);
    picks ??= extractSourcePicks(message);

    if (answer.trim() || message.stop_reason !== 'tool_use') break;

    const toolResults: Anthropic.ToolResultBlockParam[] = message.content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      .map((block) => ({ type: 'tool_result', tool_use_id: block.id, content: ANSWER_AFTER_TOOL_MESSAGE }));
    // The assistant turn goes back unchanged, thinking blocks included.
    messages = [...messages, { role: 'assistant', content: message.content }, { role: 'user', content: toolResults }];
  }

  if (!answer.trim()) throw new HttpError(502, 'AI_ERROR', MESSAGES.aiEmpty);
  sse.send({ type: 'sources', sources: resolveSources(picks, request.question) });
}

// ---------------------------------------------------------------- application-text (SSE)

/** Streams the draft as `delta` events. The caller sends `done`. */
export async function streamApplicationLive(
  client: Anthropic,
  request: ApplicationTextRequest,
  sse: SseWriter,
  signal?: AbortSignal,
): Promise<void> {
  const settings = AI_SETTINGS.applicationText;
  const stream = client.messages.stream(
    {
      ...baseParams(settings),
      output_config: { effort: settings.effort },
      system: buildApplicationSystemPrompt(),
      messages: [{ role: 'user', content: buildApplicationUserPrompt(request) }],
    },
    { signal },
  );

  let text = '';
  stream.on('text', (delta) => {
    text += delta;
    sse.send({ type: 'delta', text: delta });
  });
  const message = await stream.finalMessage();
  assertNotRefused(message);
  if (!text.trim()) throw new HttpError(502, 'AI_ERROR', MESSAGES.aiEmpty);
}
