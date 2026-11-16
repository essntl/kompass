/** Small text helpers shared by the mock templates. */

/** Lower-cases the first letter, but leaves acronyms such as "HMS" alone. */
export function lowerFirst(text: string): string {
  if (!text) return text;
  const second = text[1];
  if (second && second === second.toUpperCase() && second !== second.toLowerCase()) return text;
  return text[0].toLowerCase() + text.slice(1);
}

/** Collapses whitespace and makes sure the text ends with sentence punctuation. */
export function endSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** The first `max` sentences of a text, tidied up. */
export function leadSentences(text: string, max: number): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map(endSentence)
    .join(' ');
}

/** "a, b og c" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} og ${items[items.length - 1]}`;
}
