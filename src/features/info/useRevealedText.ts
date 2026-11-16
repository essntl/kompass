import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { advanceReveal } from './logic/reveal';

/**
 * Typing animation for a streamed answer: returns how many characters of `text` to show.
 *
 * - An answer that is already finished when it mounts (coming back to the page) is shown
 *   in full straight away; only answers that stream while on screen are typed out.
 * - With reduced motion the text appears as it arrives, without the typing pace.
 * - One requestAnimationFrame loop per answer; state updates only when the whole number
 *   of visible characters changes.
 */
export function useRevealedText(text: string, streaming: boolean): number {
  const reduce = useReducedMotion();
  const animate = useRef(streaming);
  if (streaming) animate.current = true;
  const skip = reduce || !animate.current;

  // Text that was already there on mount (coming back mid-stream) is not typed again.
  const [count, setCount] = useState(text.length);
  const progress = useRef(count);
  const latest = useRef({ length: text.length, streaming });
  latest.current = { length: text.length, streaming };

  // A retry clears the text: start over from there.
  if (text.length < progress.current) progress.current = text.length;
  if (text.length < count) setCount(text.length);

  useEffect(() => {
    if (skip) return;
    if (progress.current >= text.length) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const { length, streaming: stillStreaming } = latest.current;
      const next = advanceReveal(progress.current, length, now - last, !stillStreaming);
      last = now;
      if (Math.floor(next) !== Math.floor(progress.current)) setCount(Math.floor(next));
      progress.current = next;
      if (next < length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [skip, text.length]);

  if (skip) return text.length;
  return Math.min(count, text.length);
}
