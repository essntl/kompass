import { describe, expect, it } from 'vitest';
import { answerToSpeech, parseAnswer } from './answerText';

describe('parseAnswer', () => {
  it('splits paragraphs on blank lines and groups list lines', () => {
    const text =
      'Du søker på vigo.no.\n\nSlik går du fram:\n- Logg inn med MinID.\n- Søk formidling.\n\nLykke til.';
    expect(parseAnswer(text)).toEqual([
      { kind: 'paragraph', text: 'Du søker på vigo.no.' },
      { kind: 'paragraph', text: 'Slik går du fram:' },
      { kind: 'list', items: ['Logg inn med MinID.', 'Søk formidling.'] },
      { kind: 'paragraph', text: 'Lykke til.' },
    ]);
  });

  it('joins soft-wrapped lines and continues indented list items', () => {
    expect(parseAnswer('En linje\nsom fortsetter.\n- Punkt\n  med mer\nTekst')).toEqual([
      { kind: 'paragraph', text: 'En linje som fortsetter.' },
      { kind: 'list', items: ['Punkt med mer'] },
      { kind: 'paragraph', text: 'Tekst' },
    ]);
  });

  it('keeps markup-looking text as plain text', () => {
    expect(parseAnswer('<b>Hei</b> & velkommen')).toEqual([{ kind: 'paragraph', text: '<b>Hei</b> & velkommen' }]);
  });

  it('hides a dangling bullet while streaming, so the next item does not flash as a paragraph', () => {
    expect(parseAnswer('Punkter:\n- Ett\n-', { streaming: true })).toEqual([
      { kind: 'paragraph', text: 'Punkter:' },
      { kind: 'list', items: ['Ett'] },
    ]);
  });

  it('keeps earlier blocks stable as more text streams in', () => {
    const full = 'Første avsnitt.\n\nAndre avsnitt er lengre.';
    const partial = parseAnswer(full.slice(0, 24), { streaming: true });
    const done = parseAnswer(full);
    expect(partial[0]).toEqual(done[0]);
    expect(partial).toHaveLength(2);
  });

  it('handles empty text', () => {
    expect(parseAnswer('')).toEqual([]);
  });
});

describe('answerToSpeech', () => {
  it('reads lists as sentences', () => {
    expect(answerToSpeech('Slik:\n- Logg inn\n- Søk.')).toBe('Slik: Logg inn. Søk.');
  });
});
