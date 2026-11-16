import { describe, expect, it } from 'vitest';
import { placeLabel } from './place';

describe('placeLabel', () => {
  it('names the county only when it adds something', () => {
    expect(placeLabel({ location: 'Oslo', county: 'Oslo' })).toBe('Oslo');
    expect(placeLabel({ location: 'Lillestrøm', county: 'Akershus' })).toBe('Lillestrøm, Akershus');
    expect(placeLabel({ location: '', county: 'Akershus' })).toBe('Akershus');
  });
});
