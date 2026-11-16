import { describe, expect, it } from 'vitest';
import { createSseParser, readSseStream, type SseMessage } from './sse';

function parseAll(chunks: string[]): SseMessage[] {
  const messages: SseMessage[] = [];
  const parser = createSseParser((message) => messages.push(message));
  for (const chunk of chunks) parser.feed(chunk);
  parser.flush();
  return messages;
}

const STREAM =
  'event: delta\ndata: {"type":"delta","text":"Hei "}\n\n' +
  'event: delta\ndata: {"type":"delta","text":"på deg"}\n\n' +
  'event: sources\ndata: {"type":"sources","sources":[]}\n\n' +
  'event: done\ndata: {"type":"done","mock":true}\n\n';

const EXPECTED: SseMessage[] = [
  { event: 'delta', data: '{"type":"delta","text":"Hei "}' },
  { event: 'delta', data: '{"type":"delta","text":"på deg"}' },
  { event: 'sources', data: '{"type":"sources","sources":[]}' },
  { event: 'done', data: '{"type":"done","mock":true}' },
];

describe('createSseParser', () => {
  it('parses a complete stream', () => {
    expect(parseAll([STREAM])).toEqual(EXPECTED);
  });

  it('gives the same result however the stream is split into chunks', () => {
    for (const size of [1, 2, 3, 7, 16, 50]) {
      const chunks: string[] = [];
      for (let i = 0; i < STREAM.length; i += size) chunks.push(STREAM.slice(i, i + size));
      expect(parseAll(chunks), `chunk size ${size}`).toEqual(EXPECTED);
    }
  });

  it('handles CRLF line endings, also when CR and LF arrive in different chunks', () => {
    const crlf = STREAM.replace(/\n/g, '\r\n');
    expect(parseAll([crlf])).toEqual(EXPECTED);
    for (const size of [1, 5, 11]) {
      const chunks: string[] = [];
      for (let i = 0; i < crlf.length; i += size) chunks.push(crlf.slice(i, i + size));
      expect(parseAll(chunks), `chunk size ${size}`).toEqual(EXPECTED);
    }
  });

  it('joins multi-line data, ignores comments and defaults the event name', () => {
    expect(parseAll([': keep-alive\n\ndata: first\ndata: second\n\ndata:no-space\nid: 7\nretry: 100\n\n'])).toEqual([
      { event: 'message', data: 'first\nsecond' },
      { event: 'message', data: 'no-space' },
    ]);
  });

  it('does not dispatch events without data', () => {
    expect(parseAll(['event: ping\n\n'])).toEqual([]);
  });

  it('dispatches a final event that is not followed by a blank line', () => {
    expect(parseAll(['event: done\ndata: {"type":"done","mock":false}'])).toEqual([
      { event: 'done', data: '{"type":"done","mock":false}' },
    ]);
  });

  it('strips only one leading space from a value', () => {
    expect(parseAll(['data:  two spaces\n\n'])).toEqual([{ event: 'message', data: ' two spaces' }]);
  });
});

describe('readSseStream', () => {
  it('decodes UTF-8 that is split in the middle of a character', async () => {
    const bytes = new TextEncoder().encode('event: delta\ndata: {"type":"delta","text":"læreplass på Økern"}\n\n');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        // Three-byte slices are guaranteed to cut through the two-byte æ, å and Ø somewhere.
        for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3));
        controller.close();
      },
    });

    const messages: SseMessage[] = [];
    await readSseStream(body, (message) => messages.push(message));

    expect(messages).toHaveLength(1);
    expect(JSON.parse(messages[0].data)).toEqual({ type: 'delta', text: 'læreplass på Økern' });
  });

  it('rejects when the stream fails', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('connection lost'));
      },
    });
    await expect(readSseStream(body, () => {})).rejects.toThrow('connection lost');
  });
});
