import type { SseWriter } from '../lib/sse';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Splits text into chunks of a few words, keeping whitespace and line breaks intact. */
export function chunkText(text: string, wordsPerChunk = 3): string[] {
  const pieces = text.match(/\S+\s*/g) ?? [];
  const chunks: string[] = [];
  for (let i = 0; i < pieces.length; i += wordsPerChunk) {
    chunks.push(pieces.slice(i, i + wordsPerChunk).join(''));
  }
  return chunks;
}

/**
 * Streams `text` as `delta` events in small chunks with short pauses, so the typing
 * animation in the UI is visible in mock mode too. Stops quietly if the client goes away.
 */
export async function streamMockText(
  sse: SseWriter,
  text: string,
  options: { delayMs?: number; initialDelayMs?: number } = {},
): Promise<void> {
  const { delayMs = 28, initialDelayMs = 350 } = options;
  await sleep(initialDelayMs);
  for (const chunk of chunkText(text)) {
    if (sse.closed) return;
    sse.send({ type: 'delta', text: chunk });
    await sleep(delayMs);
  }
}
