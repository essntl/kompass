/**
 * Pacing for the typing animation. Deltas from the model arrive in uneven bursts; the UI
 * reveals the received text at a steady pace instead, speeding up when it falls behind so
 * it never lags the stream by more than a fraction of a second.
 */

/** Characters per millisecond when the reveal is keeping up (~55 per second). */
const BASE_SPEED = 0.055;
/** The reveal aims to close any backlog within this many milliseconds… */
const CATCH_UP_MS = 450;
/** …and faster once the stream has finished, so the end never drags. */
const FINISH_MS = 220;
/** Never jump more than this in one frame (keeps it reading as typing, not pasting). */
const MAX_STEP = 48;

/**
 * How many characters of `targetLength` should be visible after `elapsedMs`, given that
 * `revealed` are visible now. Fractional progress is kept by the caller.
 */
export function advanceReveal(
  revealed: number,
  targetLength: number,
  elapsedMs: number,
  finished: boolean,
): number {
  if (revealed >= targetLength) return targetLength;
  const backlog = targetLength - revealed;
  const speed = Math.max(BASE_SPEED, backlog / (finished ? FINISH_MS : CATCH_UP_MS));
  const step = Math.min(MAX_STEP, speed * Math.max(0, elapsedMs));
  return Math.min(targetLength, revealed + step);
}

/**
 * Cuts `text` at `count` characters without splitting a surrogate pair (emoji and other
 * astral characters would otherwise flash as a broken glyph for one frame).
 */
export function visibleText(text: string, count: number): string {
  let end = Math.max(0, Math.min(text.length, Math.floor(count)));
  const code = text.charCodeAt(end - 1);
  if (end > 0 && end < text.length && code >= 0xd800 && code <= 0xdbff) end -= 1;
  return text.slice(0, end);
}
