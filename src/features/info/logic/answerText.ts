/**
 * Turns the assistant's plain-text answer into blocks the UI renders as React elements
 * (never as HTML). The format is fixed by server/prompts/info.ts: paragraphs separated by
 * blank lines, list items as lines starting with "- ". No Markdown.
 *
 * It also parses half-finished text while the answer streams in, so a block that is still
 * being typed keeps its index and the blocks above it never change.
 */

export type AnswerBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

const BULLET = /^\s*[-–•*]\s+/;

/** A line that is only a bullet character so far ("-" before the space arrives). */
const PENDING_BULLET = /^\s*[-–•*]\s*$/;

export function parseAnswer(text: string, { streaming = false } = {}): AnswerBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  // While streaming, hide a dangling "-" so it does not flash as a paragraph first.
  if (streaming && lines.length && PENDING_BULLET.test(lines[lines.length - 1])) lines.pop();

  const blocks: AnswerBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  const flushList = () => {
    if (list?.length) blocks.push({ kind: 'list', items: list });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (BULLET.test(raw)) {
      flushParagraph();
      list ??= [];
      list.push(raw.replace(BULLET, '').trim());
      continue;
    }
    if (list) {
      // A plain line right under a list item continues that item (soft wrap).
      if (list.length && /^\s/.test(raw)) {
        list[list.length - 1] += ` ${line}`;
        continue;
      }
      flushList();
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** Strips list markers and blank lines: what a screen reader hears when the answer is done. */
export function answerToSpeech(text: string): string {
  return parseAnswer(text)
    .map((block) => (block.kind === 'paragraph' ? block.text : block.items.map(endSentence).join(' ')))
    .join(' ');
}

function endSentence(text: string): string {
  return /[.!?:]$/.test(text) ? text : `${text}.`;
}
