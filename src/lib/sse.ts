/**
 * Minimal Server-Sent Events parsing for POST requests.
 * (`EventSource` only supports GET, so the streaming routes are read with `fetch`.)
 */

export interface SseMessage {
  /** The `event:` field, or "message" when the server did not send one. */
  event: string;
  /** The `data:` lines joined with "\n". */
  data: string;
}

export interface SseParser {
  /** Feeds a decoded text chunk; complete events are passed to `onMessage`. */
  feed(chunk: string): void;
  /** Call when the stream ends: dispatches a last event that was not followed by a blank line. */
  flush(): void;
}

/**
 * Incremental parser following the SSE format: fields end with LF, CR or CRLF, an empty
 * line dispatches the event, and lines starting with ":" are comments. Chunks may split
 * anywhere, also in the middle of a line or between CR and LF.
 */
export function createSseParser(onMessage: (message: SseMessage) => void): SseParser {
  let buffer = '';
  let event = '';
  let data: string[] = [];
  let skipLeadingLf = false;

  const dispatch = () => {
    if (data.length > 0) onMessage({ event: event || 'message', data: data.join('\n') });
    event = '';
    data = [];
  };

  const handleLine = (line: string) => {
    if (line === '') {
      dispatch();
      return;
    }
    if (line.startsWith(':')) return;

    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
    // `id` and `retry` are not used by this app.
  };

  return {
    feed(chunk) {
      let text = chunk;
      if (skipLeadingLf && text.startsWith('\n')) text = text.slice(1);
      if (text.length > 0) skipLeadingLf = false;
      buffer += text;

      let start = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const char = buffer[i];
        if (char !== '\n' && char !== '\r') continue;
        handleLine(buffer.slice(start, i));
        if (char === '\r') {
          if (buffer[i + 1] === '\n') i += 1;
          // A CR at the very end may be the first half of a CRLF split across chunks.
          else if (i === buffer.length - 1) skipLeadingLf = true;
        }
        start = i + 1;
      }
      buffer = buffer.slice(start);
    },
    flush() {
      if (buffer.length > 0) {
        handleLine(buffer);
        buffer = '';
      }
      dispatch();
    },
  };
}

/**
 * Reads an SSE response body to the end and passes every event to `onMessage`.
 * Rejects with the reader's error (an `AbortError` when the request is aborted).
 */
export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onMessage: (message: SseMessage) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  const parser = createSseParser(onMessage);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
    parser.feed(decoder.decode());
    parser.flush();
  } finally {
    reader.releaseLock();
  }
}
