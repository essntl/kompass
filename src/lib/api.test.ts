import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  detectAbsence,
  geocode,
  getHealth,
  isAbortError,
  planTrips,
  streamApplicationText,
  streamInfoAnswer,
} from './api';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function sse(events: Array<Record<string, unknown>>, chunkSize = 23): Response {
  const bytes = new TextEncoder().encode(
    events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''),
  );
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('JSON routes', () => {
  it('GETs /api/health', async () => {
    const fetchSpy = mockFetch(() => json({ ok: true, ai: 'mock', model: 'claude-haiku-5-5' }));
    await expect(getHealth()).resolves.toEqual({ ok: true, ai: 'mock', model: 'claude-haiku-5-5' });
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/health');
  });

  it('POSTs the request body as JSON', async () => {
    const fetchSpy = mockFetch(() => json({ isAbsence: false }));
    const request = { message: 'Hei', today: '2026-11-16', upcomingClasses: [] };
    await detectAbsence(request);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/ai/absence-detect');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(request);
  });

  it('builds the geocode query, with the focus point only when both parts are given', async () => {
    const fetchSpy = mockFetch(() => json({ features: [] }));
    await geocode('Kabelgata 10', { lat: 59.92, lon: 10.76 });
    await geocode('Økern', { lat: 59.92 });

    expect(fetchSpy.mock.calls[0][0]).toBe('/api/entur/geocode?q=Kabelgata+10&lat=59.92&lon=10.76');
    expect(fetchSpy.mock.calls[1][0]).toBe('/api/entur/geocode?q=%C3%98kern');
  });

  it('turns the server error body into an ApiError', async () => {
    mockFetch(() => json({ error: { code: 'UPSTREAM_ERROR', message: 'Fikk ikke kontakt med reiseplanleggeren.' } }, 502));
    const error = await planTrips({
      from: { label: 'A', lat: 1, lon: 1 },
      to: { label: 'B', lat: 2, lon: 2 },
      dateTime: '2026-11-17T08:00:00+01:00',
      arriveBy: true,
      walkSpeed: 1.3,
    }).catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'UPSTREAM_ERROR',
      status: 502,
      message: 'Fikk ikke kontakt med reiseplanleggeren.',
    });
  });

  it('reports NETWORK when the server cannot be reached', async () => {
    mockFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    const error = await getHealth().catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('NETWORK');
    expect(error.message).toMatch(/Fikk ikke kontakt med serveren/);
  });

  it('reports NETWORK for a proxy error page (API server down behind the dev proxy)', async () => {
    mockFetch(() => new Response('Internal Server Error', { status: 500 }));
    await expect(getHealth()).rejects.toMatchObject({ code: 'NETWORK', status: 500 });
  });

  it('lets an abort through as AbortError, not as ApiError', async () => {
    mockFetch(() => {
      throw new DOMException('Aborted', 'AbortError');
    });
    const error = await getHealth({ signal: AbortSignal.abort() }).catch((err) => err);
    expect(isAbortError(error)).toBe(true);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});

describe('streaming routes', () => {
  it('passes deltas and sources to the handlers and resolves with the mock flag', async () => {
    const sources = [{ sourceId: 'vilbli-laerling', title: 'Lærling', url: 'https://www.vilbli.no/nb/no/a/laerling-6', why: 'Fordi.' }];
    const fetchSpy = mockFetch(() =>
      sse([
        { type: 'delta', text: 'Som lærling ' },
        { type: 'delta', text: 'får du lønn.' },
        { type: 'sources', sources },
        { type: 'done', mock: true },
      ]),
    );
    const deltas: string[] = [];
    const onSources = vi.fn();

    const result = await streamInfoAnswer({ question: 'Får lærlinger lønn?' }, { onDelta: (text) => deltas.push(text), onSources });

    expect(result).toEqual({ mock: true });
    expect(deltas.join('')).toBe('Som lærling får du lønn.');
    expect(onSources).toHaveBeenCalledExactlyOnceWith(sources);
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/ai/info');
  });

  it('rejects with the code and message from an error event', async () => {
    mockFetch(() =>
      sse([
        { type: 'delta', text: 'Hei' },
        { type: 'error', code: 'RATE_LIMITED', message: 'Vent litt og prøv igjen.' },
      ]),
    );
    const onDelta = vi.fn();
    const error = await streamApplicationText(
      { student: { name: 'Sara', year: 'Vg1', programme: 'TIF' }, entries: [] },
      { onDelta },
    ).catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'RATE_LIMITED', message: 'Vent litt og prøv igjen.' });
    expect(onDelta).toHaveBeenCalledTimes(1);
  });

  it('rejects when the stream ends without a done event', async () => {
    mockFetch(() => sse([{ type: 'delta', text: 'Halvt svar' }]));
    await expect(streamInfoAnswer({ question: 'x' }, { onDelta: () => {} })).rejects.toMatchObject({ code: 'AI_ERROR' });
  });

  it('rejects with the JSON error when the server fails before the stream starts', async () => {
    mockFetch(() => json({ error: { code: 'BAD_REQUEST', message: 'Forespørselen mangler noe.' } }, 400));
    await expect(streamInfoAnswer({ question: '' }, { onDelta: () => {} })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
    });
  });
});
