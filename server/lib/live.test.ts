import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import type { AbsenceDetectRequest, StreamEvent } from '../../shared/api';
import { getInfoSource } from '../../shared/infoSources';
import { RECOMMEND_SOURCES_TOOL } from '../prompts/info';
import { AI_SETTINGS, AiRefusalError, mapAiError } from './anthropic';
import { HttpError } from './errors';
import {
  describePortfolioLive,
  detectAbsenceLive,
  readTimetablePdfLive,
  streamApplicationLive,
  streamInfoLive,
  TIMETABLE_PDF_TIMEOUT_MS,
} from './live';
import { buildTimetableResponse } from './timetable';
import type { SseWriter } from './sse';

/**
 * These tests run the live code paths against a fake client. They check our own
 * handling (stop reasons, validation, event order) – not the real API.
 */

interface FakeTurn {
  /** Text deltas emitted through `stream.on('text')`. */
  deltas?: string[];
  message: Record<string, unknown>;
}

function fakeClient(turns: FakeTurn[]) {
  const calls: Array<Record<string, any>> = [];
  let index = 0;
  const next = () => {
    const turn = turns[index];
    index += 1;
    if (!turn) throw new Error('fake client: no more turns');
    return turn;
  };

  const client = {
    messages: {
      async create(params: Record<string, any>) {
        calls.push(params);
        return next().message;
      },
      stream(params: Record<string, any>) {
        calls.push(params);
        const turn = next();
        const listeners: Array<(delta: string) => void> = [];
        return {
          on(event: string, listener: (delta: string) => void) {
            if (event === 'text') listeners.push(listener);
            return this;
          },
          async finalMessage() {
            for (const delta of turn.deltas ?? []) listeners.forEach((listener) => listener(delta));
            return turn.message;
          },
        };
      },
    },
  } as unknown as Anthropic;

  return { client, calls };
}

function fakeSse() {
  const events: StreamEvent[] = [];
  const sse: SseWriter = {
    started: false,
    closed: false,
    send: (event) => void events.push(event),
    end: () => {},
  };
  return { sse, events };
}

const thinking = { type: 'thinking', thinking: '', signature: 'sig' };
const text = (value: string) => ({ type: 'text', text: value });
const toolUse = (input: unknown) => ({ type: 'tool_use', id: 'toolu_1', name: RECOMMEND_SOURCES_TOOL, input });

describe('streamInfoLive', () => {
  it('streams the text, then sends validated sources from the curated list', async () => {
    const { client, calls } = fakeClient([
      {
        deltas: ['Du søker ', 'på vigo.no.'],
        message: {
          stop_reason: 'tool_use',
          content: [
            thinking,
            text('Du søker på vigo.no.'),
            toolUse({
              sources: [
                { id: 'vilbli-soke-laereplass', why: 'Forklarer søknaden.' },
                { id: 'https://evil.example/fake', why: 'Funnet opp av modellen.' },
              ],
            }),
          ],
        },
      },
    ]);
    const { sse, events } = fakeSse();

    await streamInfoLive(client, { question: 'Hvordan søker jeg læreplass?' }, sse);

    const curated = getInfoSource('vilbli-soke-laereplass')!;
    expect(events).toEqual([
      { type: 'delta', text: 'Du søker ' },
      { type: 'delta', text: 'på vigo.no.' },
      {
        type: 'sources',
        sources: [{ sourceId: curated.id, title: curated.title, url: curated.url, why: 'Forklarer søknaden.' }],
      },
    ]);

    expect(calls).toHaveLength(1);
    expect(calls[0].model).toBe('claude-haiku-5-5');
    expect(calls[0].thinking).toEqual({ type: 'adaptive' });
    expect(calls[0].tools[0]).toMatchObject({ name: RECOMMEND_SOURCES_TOOL, strict: true });
    expect(calls[0].tool_choice).toBeUndefined();
    expect(calls[0].temperature).toBeUndefined();
    expect(calls[0].system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(calls[0].messages.at(-1)).toEqual({ role: 'user', content: 'Hvordan søker jeg læreplass?' });
  });

  it('falls back to a keyword match when the model recommends nothing', async () => {
    const { client } = fakeClient([
      { deltas: ['Grensen er ti prosent.'], message: { stop_reason: 'end_turn', content: [text('Grensen er ti prosent.')] } },
    ]);
    const { sse, events } = fakeSse();

    await streamInfoLive(client, { question: 'Hva er fraværsgrensen?' }, sse);

    const sources = events.find((event) => event.type === 'sources');
    expect(sources?.type === 'sources' && sources.sources.length).toBeGreaterThanOrEqual(1);
    expect(sources?.type === 'sources' && getInfoSource(sources.sources[0].sourceId)?.topics).toContain('fravaer');
  });

  it('asks for the answer in a second turn when the model calls the tool first', async () => {
    const firstContent = [thinking, toolUse({ sources: [{ id: 'lanekassen-vgs', why: 'Viser stipendene.' }] })];
    const { client, calls } = fakeClient([
      { message: { stop_reason: 'tool_use', content: firstContent } },
      { deltas: ['De fleste får utstyrsstipend.'], message: { stop_reason: 'end_turn', content: [text('De fleste får utstyrsstipend.')] } },
    ]);
    const { sse, events } = fakeSse();

    await streamInfoLive(client, { question: 'Kan jeg få stipend?' }, sse);

    expect(events.map((event) => event.type)).toEqual(['delta', 'sources']);
    expect(events[1]).toMatchObject({ sources: [{ sourceId: 'lanekassen-vgs' }] });

    expect(calls).toHaveLength(2);
    const followUp = calls[1].messages;
    // The assistant turn goes back unchanged (thinking block included), then the tool result.
    expect(followUp.at(-2)).toEqual({ role: 'assistant', content: firstContent });
    expect(followUp.at(-1).content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'toolu_1' });
  });

  it('keeps the last turns of the history and starts with a user turn', async () => {
    const { client, calls } = fakeClient([
      { deltas: ['Svar.'], message: { stop_reason: 'end_turn', content: [text('Svar.')] } },
    ]);
    const history = Array.from({ length: 9 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      text: `tur ${i}`,
    }));

    await streamInfoLive(client, { question: 'Og lønn?', history }, fakeSse().sse);

    const messages = calls[0].messages;
    expect(messages[0].role).toBe('user');
    expect(messages.at(-1)).toEqual({ role: 'user', content: 'Og lønn?' });
    expect(messages.length).toBeLessThanOrEqual(7);
  });

  it('throws on a refusal, which maps to a friendly AI_ERROR', async () => {
    const { client } = fakeClient([
      { message: { stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'general_harms' }, content: [] } },
    ]);

    const error = await streamInfoLive(client, { question: 'x' }, fakeSse().sse).catch((err) => err);

    expect(error).toBeInstanceOf(AiRefusalError);
    expect(mapAiError(error)).toMatchObject({ status: 422, code: 'AI_ERROR' });
  });

  it('reports an empty answer as an error', async () => {
    const { client } = fakeClient([{ message: { stop_reason: 'end_turn', content: [thinking] } }]);
    await expect(streamInfoLive(client, { question: 'x' }, fakeSse().sse)).rejects.toMatchObject({ code: 'AI_ERROR' });
  });
});

describe('streamApplicationLive', () => {
  it('streams the draft as delta events', async () => {
    const { client, calls } = fakeClient([
      { deltas: ['Hei,\n\n', 'Jeg heter Sara.'], message: { stop_reason: 'end_turn', content: [text('Hei,\n\nJeg heter Sara.')] } },
    ]);
    const { sse, events } = fakeSse();

    await streamApplicationLive(
      client,
      { student: { name: 'Sara Nilsen', year: 'VG1', programme: 'Teknologi- og industrifag' }, entries: [] },
      sse,
    );

    expect(events).toEqual([
      { type: 'delta', text: 'Hei,\n\n' },
      { type: 'delta', text: 'Jeg heter Sara.' },
    ]);
    expect(calls[0].messages[0].content).toContain('Sara Nilsen');
    expect(calls[0].tools).toBeUndefined();
  });
});

describe('detectAbsenceLive', () => {
  const request: AbsenceDetectRequest = {
    message: 'Jeg er syk i morgen og rekker ikke norsken.',
    today: '2026-11-16',
    upcomingClasses: [
      { eventId: 'tue-1', date: '2026-11-17', subject: 'Matematikk', start: '08:15', end: '09:45' },
      { eventId: 'tue-2', date: '2026-11-17', subject: 'Norsk', start: '10:00', end: '11:30' },
    ],
  };
  const json = (value: unknown) => text(JSON.stringify(value));

  it('reads the JSON after the thinking block and computes classEventIds on the server', async () => {
    const { client, calls } = fakeClient([
      {
        message: {
          stop_reason: 'end_turn',
          content: [
            thinking,
            json({ isAbsence: true, dates: ['2026-11-17'], classes: ['norsk'], wholeDay: false, reason: 'sykdom', reasonText: 'Syk' }),
          ],
        },
      },
    ]);

    await expect(detectAbsenceLive(client, request)).resolves.toEqual({
      isAbsence: true,
      dates: ['2026-11-17'],
      classes: ['Norsk'],
      classEventIds: ['tue-2'],
      wholeDay: false,
      reason: 'sykdom',
      reasonText: 'Syk',
      mock: false,
    });

    expect(calls[0].output_config.format.type).toBe('json_schema');
    expect(calls[0].output_config.effort).toBe('low');
    expect(calls[0].tool_choice).toBeUndefined();
    expect(calls[0].messages[0].content).toContain('mandag 16. november 2026 (2026-11-16)');
    expect(calls[0].messages[0].content).toContain('2026-11-17 (tirsdag) 10:00–11:30: Norsk');
  });

  it('rejects output that does not follow the schema', async () => {
    const { client } = fakeClient([{ message: { stop_reason: 'end_turn', content: [json({ isAbsence: 'ja' })] } }]);
    await expect(detectAbsenceLive(client, request)).rejects.toBeInstanceOf(HttpError);
  });

  it('does not read content after a refusal or a max_tokens cut-off', async () => {
    const refusal = fakeClient([{ message: { stop_reason: 'refusal', stop_details: null, content: [] } }]);
    await expect(detectAbsenceLive(refusal.client, request)).rejects.toBeInstanceOf(AiRefusalError);

    const cutOff = fakeClient([{ message: { stop_reason: 'max_tokens', content: [text('{"isAbsence": tr')] } }]);
    await expect(detectAbsenceLive(cutOff.client, request)).rejects.toMatchObject({ code: 'AI_ERROR' });
  });
});

describe('describePortfolioLive', () => {
  it('sends the image before the text and clamps skills and goals', async () => {
    const output = {
      summary: '  Viser at jeg kan sveise en enkel T-skjøt.  ',
      whatWasDone: 'Jeg heftet og sveiset to plater.',
      skills: ['MAG-sveising', 'MAG-sveising', 'Måling', 'HMS', 'Sliping', 'Tegningslesing', 'Planlegging', 'Kontroll'],
      suggestedGoals: [1, 2, 3, 4].map((n) => ({ text: `Kan handle om mål ${n}`, why: `Det kan passe ${n}.` })),
    };
    const { client, calls } = fakeClient([
      { message: { stop_reason: 'end_turn', content: [thinking, text(JSON.stringify(output))] } },
    ]);

    const { competence } = await describePortfolioLive(client, {
      title: 'T-skjøt',
      note: 'Sveiset to plater.',
      programme: 'Teknologi- og industrifag',
      year: 'VG1',
      image: { mediaType: 'image/jpeg', data: 'AAAA' },
    });

    expect(competence.summary).toBe('Viser at jeg kan sveise en enkel T-skjøt.');
    expect(competence.skills).toEqual(['MAG-sveising', 'Måling', 'HMS', 'Sliping', 'Tegningslesing', 'Planlegging']);
    expect(competence.suggestedGoals).toHaveLength(3);
    expect(competence.mock).toBe(false);
    expect(Number.isNaN(Date.parse(competence.generatedAt))).toBe(false);

    const content = calls[0].messages[0].content;
    expect(content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } });
    expect(content[1].type).toBe('text');
  });
});

describe('readTimetablePdfLive', () => {
  const output = {
    isTimetable: true,
    weekNumber: 47,
    year: null,
    lessons: [
      { weekday: 'mandag', date: null, start: '8.15', end: '09:45', subject: 'Norsk', room: 'B214', teacher: 'Ingrid Solheim', address: null },
      { weekday: 'mandag', date: null, start: '11:30', end: '12:00', subject: 'Lunsj', room: null, teacher: null, address: null },
    ],
  };

  it('sends the PDF as a base64 document block before the text and asks for structured output', async () => {
    const { client, calls } = fakeClient([
      { message: { stop_reason: 'end_turn', content: [thinking, text(JSON.stringify(output))] } },
    ]);
    const controller = new AbortController();

    const result = await readTimetablePdfLive(
      client,
      { pdf: 'JVBERi0xLjc=', fileName: 'timeplan.pdf', today: '2026-11-17' },
      controller.signal,
    );

    expect(result).toEqual(output);
    const params = calls[0];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.thinking).toEqual({ type: 'adaptive' });
    expect(params.output_config.format.type).toBe('json_schema');
    expect(params.output_config.effort).toBe(AI_SETTINGS.timetablePdf.effort);
    expect(params.temperature).toBeUndefined();
    const content = params.messages[0].content;
    expect(content[0]).toEqual({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0xLjc=' },
    });
    expect(content[1]).toMatchObject({ type: 'text' });
    expect(content[1].text).toContain('timeplan.pdf');
  });

  it('passes the abort signal and a longer timeout to the SDK', async () => {
    const seen: unknown[] = [];
    const client = {
      messages: {
        async create(_params: unknown, options: unknown) {
          seen.push(options);
          return { stop_reason: 'end_turn', content: [text(JSON.stringify(output))] };
        },
      },
    } as unknown as Anthropic;
    const controller = new AbortController();
    await readTimetablePdfLive(client, { pdf: 'JVBERi0=', today: '2026-11-17' }, controller.signal);
    expect(seen[0]).toEqual({ signal: controller.signal, timeout: TIMETABLE_PDF_TIMEOUT_MS });
  });

  it('turns the model output into an importable response, cleaning it in code', async () => {
    const { client } = fakeClient([{ message: { stop_reason: 'end_turn', content: [text(JSON.stringify(output))] } }]);
    const read = await readTimetablePdfLive(client, { pdf: 'JVBERi0=', today: '2026-11-17' });
    const response = buildTimetableResponse(read, { today: '2026-11-17' }, { mock: false });
    expect(response).toMatchObject({ lessonCount: 1, weekStart: '2026-11-16', repeatsUntil: '2027-06-20', mock: false });
    expect(response.ics).toContain('DTSTART;TZID=Europe/Oslo:20261116T081500');
    expect(response.ics).not.toContain('Lunsj');
  });

  it('rejects malformed output, refusals and cut-off answers', async () => {
    const bad = fakeClient([{ message: { stop_reason: 'end_turn', content: [text('{"isTimetable": "ja"}')] } }]);
    await expect(readTimetablePdfLive(bad.client, { pdf: 'JVBERi0=', today: '2026-11-17' })).rejects.toMatchObject({ code: 'AI_ERROR' });

    const refusal = fakeClient([{ message: { stop_reason: 'refusal', stop_details: null, content: [] } }]);
    await expect(readTimetablePdfLive(refusal.client, { pdf: 'JVBERi0=', today: '2026-11-17' })).rejects.toBeInstanceOf(AiRefusalError);

    const cutOff = fakeClient([{ message: { stop_reason: 'max_tokens', content: [text('{"lessons": [')] } }]);
    await expect(readTimetablePdfLive(cutOff.client, { pdf: 'JVBERi0=', today: '2026-11-17' })).rejects.toMatchObject({ code: 'AI_ERROR' });
  });
});

describe('mapAiError', () => {
  const apiError = (status: number) => Anthropic.APIError.generate(status, { error: { message: 'x' } }, 'x', new Headers());

  it('maps SDK errors to codes and Norwegian messages', () => {
    expect(mapAiError(apiError(429))).toMatchObject({ status: 429, code: 'RATE_LIMITED' });
    expect(mapAiError(apiError(401))).toMatchObject({ status: 502, code: 'AI_ERROR' });
    expect(mapAiError(apiError(500))).toMatchObject({ status: 502, code: 'AI_ERROR' });
    expect(mapAiError(apiError(529))).toMatchObject({ status: 502, code: 'AI_ERROR' });
    expect(mapAiError(new Anthropic.APIConnectionTimeoutError())).toMatchObject({ status: 504, code: 'AI_ERROR' });
    expect(mapAiError(new Anthropic.APIConnectionError({ message: 'offline' }))).toMatchObject({ code: 'AI_ERROR' });
    expect(mapAiError(new Error('boom'))).toMatchObject({ code: 'AI_ERROR' });
  });

  it('never leaks the upstream message', () => {
    const mapped = mapAiError(apiError(401));
    expect(mapped.message).not.toContain('x-api-key');
    expect(mapped.message).toMatch(/AI-hjelperen/);
  });
});
