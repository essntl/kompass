/**
 * AI routes. Each route validates its body, then runs either the live implementation
 * (lib/live.ts) or the mock (mock/*) depending on whether an API key is configured.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import type { AbsenceDetectResponse, PortfolioDescribeResponse } from '../../shared/api';
import { finalizeDetection } from '../lib/absence';
import { getAnthropicClient, isAbortError, mapAiError } from '../lib/anthropic';
import { describePortfolioLive, detectAbsenceLive, streamApplicationLive, streamInfoLive } from '../lib/live';
import { createSseWriter, type SseWriter } from '../lib/sse';
import {
  absenceDetectSchema,
  applicationTextSchema,
  infoAskSchema,
  parseInput,
  portfolioDescribeSchema,
} from '../lib/validate';
import { detectAbsenceHeuristic } from '../mock/absence';
import { buildMockApplicationText } from '../mock/application';
import { buildMockInfoAnswer } from '../mock/info';
import { buildMockCompetence } from '../mock/portfolio';
import { streamMockText } from '../mock/stream';

export const aiRouter = Router();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** A short pause so mock answers feel like a real request in the UI. */
const MOCK_DELAY_MS = 450;

aiRouter.post('/absence-detect', async (req, res) => {
  const body = parseInput(absenceDetectSchema, req.body);
  const client = getAnthropicClient();

  let result: AbsenceDetectResponse;
  if (client) {
    try {
      result = await detectAbsenceLive(client, body);
    } catch (err) {
      throw mapAiError(err);
    }
  } else {
    result = finalizeDetection(detectAbsenceHeuristic(body), body, true);
  }
  res.json(result);
});

aiRouter.post('/portfolio/describe', async (req, res) => {
  const body = parseInput(portfolioDescribeSchema, req.body);
  const client = getAnthropicClient();

  let result: PortfolioDescribeResponse;
  if (client) {
    try {
      result = await describePortfolioLive(client, body);
    } catch (err) {
      throw mapAiError(err);
    }
  } else {
    await sleep(MOCK_DELAY_MS);
    result = { competence: buildMockCompetence(body) };
  }
  res.json(result);
});

/**
 * Shared plumbing for the two streaming routes: opens the SSE stream, aborts the upstream
 * request when the browser goes away, sends `done`, and reports failures either as a JSON
 * error (nothing sent yet) or as an `error` event (stream already started).
 */
async function runStream(
  req: Request,
  res: Response,
  next: NextFunction,
  mock: boolean,
  run: (sse: SseWriter, signal: AbortSignal) => Promise<void>,
): Promise<void> {
  const sse = createSseWriter(res);
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    await run(sse, controller.signal);
    sse.send({ type: 'done', mock });
    sse.end();
  } catch (err) {
    if (controller.signal.aborted || isAbortError(err)) return; // the browser went away
    const httpError = mapAiError(err);
    console.error(`[api] ${req.method} ${req.originalUrl} failed: ${httpError.code}`, httpError.cause ?? httpError);
    if (!sse.started) {
      next(httpError);
      return;
    }
    sse.send({ type: 'error', code: httpError.code, message: httpError.message });
    sse.end();
  }
}

aiRouter.post('/info', async (req, res, next) => {
  const body = parseInput(infoAskSchema, req.body);
  const client = getAnthropicClient();

  await runStream(req, res, next, !client, async (sse, signal) => {
    if (client) {
      await streamInfoLive(client, body, sse, signal);
      return;
    }
    const answer = buildMockInfoAnswer(body.question);
    await streamMockText(sse, answer.text);
    sse.send({ type: 'sources', sources: answer.sources });
  });
});

aiRouter.post('/application-text', async (req, res, next) => {
  const body = parseInput(applicationTextSchema, req.body);
  const client = getAnthropicClient();

  await runStream(req, res, next, !client, async (sse, signal) => {
    if (client) {
      await streamApplicationLive(client, body, sse, signal);
      return;
    }
    await streamMockText(sse, buildMockApplicationText(body));
  });
});
