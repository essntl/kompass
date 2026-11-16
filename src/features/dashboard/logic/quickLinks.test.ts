import { describe, expect, it } from 'vitest';
import { displayHost, normalizeUrl, validateQuickLink } from './quickLinks';

describe('normalizeUrl', () => {
  it('adds https:// when the scheme is missing', () => {
    expect(normalizeUrl('vilbli.no')).toBe('https://vilbli.no/');
    expect(normalizeUrl('  www.udir.no/laring  ')).toBe('https://www.udir.no/laring');
  });

  it('keeps http and https links', () => {
    expect(normalizeUrl('https://teams.microsoft.com/')).toBe('https://teams.microsoft.com/');
    expect(normalizeUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1');
  });

  it('rejects things that are not web links', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('hei på deg')).toBeNull();
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('mailto:kari@skole.no')).toBeNull();
    expect(normalizeUrl('ftp://files.example.com')).toBeNull();
    expect(normalizeUrl('vilbli')).toBeNull();
  });
});

describe('validateQuickLink', () => {
  it('cleans a valid draft', () => {
    expect(validateQuickLink({ label: '  Visma   InSchool ', url: 'inschool.visma.no', icon: 'school' })).toEqual({
      errors: {},
      value: { label: 'Visma InSchool', url: 'https://inschool.visma.no/', icon: 'school' },
    });
  });

  it('reports missing and invalid fields in Norwegian', () => {
    const result = validateQuickLink({ label: ' ', url: 'ikke en lenke' });
    expect(result.value).toBeUndefined();
    expect(result.errors.label).toBe('Gi snarveien et navn.');
    expect(result.errors.url).toMatch(/nettadresse/);
    expect(validateQuickLink({ label: 'A', url: '' }).errors.url).toBe('Skriv inn en nettadresse.');
  });
});

describe('displayHost', () => {
  it('strips www', () => {
    expect(displayHost('https://www.vilbli.no/fag')).toBe('vilbli.no');
  });
});
