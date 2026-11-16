import { describe, expect, it } from 'vitest';
import { advanceReveal, visibleText } from './reveal';

describe('advanceReveal', () => {
  it('reveals at a steady base pace when keeping up', () => {
    const next = advanceReveal(0, 5, 16, false);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(5);
  });

  it('speeds up when it falls behind, but never past the target', () => {
    const slow = advanceReveal(0, 10, 16, false) - 0;
    const fast = advanceReveal(0, 400, 16, false) - 0;
    expect(fast).toBeGreaterThan(slow);
    expect(advanceReveal(395, 400, 1000, true)).toBe(400);
  });

  it('finishes faster once the stream is done', () => {
    expect(advanceReveal(0, 300, 16, true)).toBeGreaterThan(advanceReveal(0, 300, 16, false));
  });
});

describe('visibleText', () => {
  it('never splits a surrogate pair', () => {
    expect(visibleText('a😀b', 2)).toBe('a');
    expect(visibleText('a😀b', 3)).toBe('a😀');
  });
});
