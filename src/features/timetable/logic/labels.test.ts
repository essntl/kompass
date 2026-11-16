import { describe, expect, it } from 'vitest';
import { dayTitles, upperFirst } from './labels';

describe('labels', () => {
  it('capitalises only the first letter', () => {
    expect(upperFirst('mandag 16. november')).toBe('Mandag 16. november');
    expect(upperFirst('')).toBe('');
  });

  it('gives a long and a short day title with lower-case months', () => {
    expect(dayTitles('2026-11-16')).toEqual({
      long: 'Mandag 16. november',
      short: 'Mandag 16. nov.',
    });
  });
});
