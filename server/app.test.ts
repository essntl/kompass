import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';

/**
 * Runs the real Express app on a random free port in mock mode (no API key) and talks to
 * it over HTTP. Entur is not called here.
 */
let server: Server;
let base: string;
let distDir: string;
const savedKey = process.env.ANTHROPIC_API_KEY;

beforeAll(async () => {
  delete process.env.ANTHROPIC_API_KEY;
  distDir = mkdtempSync(path.join(tmpdir(), 'kompass-dist-'));
  writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>Kompass</title>');
  writeFileSync(path.join(distDir, 'app.js'), 'console.log("kompass")');

  const app = createApp({ distDir });
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(distDir, { recursive: true, force: true });
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
});

const postJson = (url: string, body: unknown) =>
  fetch(`${base}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('API server (mock mode)', () => {
  it('reports mock mode on /api/health', async () => {
    const response = await fetch(`${base}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, ai: 'mock', model: 'claude-haiku-5-5' });
  });

  it('answers unknown API routes with a JSON 404', async () => {
    const response = await fetch(`${base}/api/does-not-exist`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Fant ikke det du lette etter.' } });
  });

  it('answers invalid bodies with BAD_REQUEST and a Norwegian message', async () => {
    for (const body of ['{not json', { question: '' }, {}]) {
      const response = await postJson('/api/ai/info', body);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe('BAD_REQUEST');
      expect(json.error.message).toMatch(/^Forespørselen mangler noe/);
    }
  });

  it('rejects bodies over the size limit with a friendly message', async () => {
    const response = await postJson('/api/ai/portfolio/describe', { title: 'x', note: 'y'.repeat(9 * 1024 * 1024) });
    expect(response.status).toBe(413);
    expect((await response.json()).error).toEqual({
      code: 'BAD_REQUEST',
      message: 'Det du sendte, er for stort. Prøv med et mindre bilde.',
    });
  });

  it('detects absence with the heuristic and marks the answer as mock', async () => {
    const response = await postJson('/api/ai/absence-detect', {
      message: 'Jeg er syk og kommer ikke i dag.',
      today: '2026-11-16',
      upcomingClasses: [],
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ isAbsence: true, dates: ['2026-11-16'], wholeDay: true, mock: true });
  });

  it('describes a portfolio entry in mock mode', async () => {
    const response = await postJson('/api/ai/portfolio/describe', {
      title: 'Dreid aksling',
      note: 'Dreide en aksling etter tegning.',
      programme: 'Teknologi- og industrifag',
      year: 'Vg1',
    });
    expect(response.status).toBe(200);
    const { competence } = await response.json();
    expect(competence.mock).toBe(true);
    expect(competence.skills.length).toBeGreaterThanOrEqual(3);
    expect(competence.suggestedGoals.length).toBeGreaterThanOrEqual(1);
  });

  it('streams an info answer as delta events, then sources, then done', async () => {
    const response = await postJson('/api/ai/info', { question: 'Hva er et opplæringskontor?' });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const events = (await response.text())
      .trim()
      .split('\n\n')
      .map((block) => {
        const [eventLine, dataLine] = block.split('\n');
        return { event: eventLine.replace('event: ', ''), data: JSON.parse(dataLine.replace('data: ', '')) };
      });

    const types = events.map((event) => event.event);
    expect(types.filter((type) => type === 'delta').length).toBeGreaterThan(5);
    expect(types.slice(-2)).toEqual(['sources', 'done']);
    expect(events.every((event) => event.event === event.data.type)).toBe(true);

    const text = events.filter((event) => event.event === 'delta').map((event) => event.data.text).join('');
    expect(text).toContain('opplæringskontor');
    expect(events.at(-2)!.data.sources[0]).toMatchObject({ sourceId: 'vilbli-opplaeringskontor' });
    expect(events.at(-1)!.data).toEqual({ type: 'done', mock: true });
  });

  it('streams an application draft and ends with done', async () => {
    const response = await postJson('/api/ai/application-text', {
      student: { name: 'Sara Nilsen', year: 'Vg1', programme: 'Teknologi- og industrifag' },
      entries: [],
    });
    const body = await response.text();
    expect(body).toContain('event: delta');
    expect(body).not.toContain('event: sources');
    expect(body.trim().endsWith('data: {"type":"done","mock":true}')).toBe(true);
  });
});

describe('--serve-dist', () => {
  it('serves static files and falls back to index.html for client routes', async () => {
    const asset = await fetch(`${base}/app.js`);
    expect(await asset.text()).toContain('kompass');

    const page = await fetch(`${base}/laerlingplass/abc`, { headers: { Accept: 'text/html' } });
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<title>Kompass</title>');
  });

  it('never answers API paths with the SPA shell', async () => {
    const response = await fetch(`${base}/api/unknown`, { headers: { Accept: 'text/html' } });
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
