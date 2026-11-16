import type { Response } from 'express';
import type { StreamEvent } from '../../shared/api';

/**
 * Writes `StreamEvent`s as Server-Sent Events.
 *
 * The stream is opened lazily on the first event. Until then nothing has been sent, so a
 * route can still fail with a normal JSON error and a proper HTTP status (see `started`).
 */
export interface SseWriter {
  /** True once the SSE headers have been sent. */
  readonly started: boolean;
  /** True when the client went away or the stream was ended. */
  readonly closed: boolean;
  send(event: StreamEvent): void;
  end(): void;
}

export function formatSseEvent(event: StreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function createSseWriter(res: Response): SseWriter {
  let started = false;
  let closed = false;

  res.on('close', () => {
    closed = true;
  });

  const open = () => {
    started = true;
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Tells nginx-style proxies not to buffer the stream.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  };

  return {
    get started() {
      return started;
    },
    get closed() {
      return closed;
    },
    send(event) {
      if (closed) return;
      if (!started) open();
      res.write(formatSseEvent(event));
    },
    end() {
      if (closed) return;
      if (!started) open();
      closed = true;
      res.end();
    },
  };
}
