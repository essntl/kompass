import { describe, expect, it } from 'vitest';
import { getInfoSource, INFO_SOURCES } from '../../shared/infoSources';
import { fallbackSources, GENERAL_SOURCE_ID, MAX_SOURCES, resolveSources } from './sources';

describe('resolveSources', () => {
  it('takes title and URL from the curated list, never from the model', () => {
    const [source] = resolveSources([{ id: 'udir-fravaersgrensen', why: 'Forklarer tiprosentgrensen.' }], 'fravær');
    const curated = getInfoSource('udir-fravaersgrensen')!;
    expect(source).toEqual({
      sourceId: curated.id,
      title: curated.title,
      url: curated.url,
      why: 'Forklarer tiprosentgrensen.',
    });
  });

  it('drops unknown ids and duplicates', () => {
    const sources = resolveSources(
      [
        { id: 'https://example.com/made-up', why: 'Funnet opp.' },
        { id: 'vilbli-laerling', why: 'Om lærlinger.' },
        { id: 'vilbli-laerling', why: 'Samme en gang til.' },
        { id: 'does-not-exist', why: 'Finnes ikke.' },
      ],
      'Hva er en lærling?',
    );
    expect(sources.map((source) => source.sourceId)).toEqual(['vilbli-laerling']);
  });

  it('caps the list at three sources', () => {
    const picks = INFO_SOURCES.slice(0, 5).map((source) => ({ id: source.id, why: 'Relevant.' }));
    expect(resolveSources(picks, 'lærling')).toHaveLength(MAX_SOURCES);
  });

  it('fills in a reason when the model leaves it empty', () => {
    const [source] = resolveSources([{ id: 'lanekassen-vgs', why: '   ' }], 'Kan jeg få stipend?');
    expect(source.why.length).toBeGreaterThan(5);
  });

  it('falls back to a keyword match when the model returns nothing usable', () => {
    for (const picks of [null, undefined, [], [{ id: 'nope', why: 'x' }]]) {
      const sources = resolveSources(picks, 'Hvor mye fravær kan jeg ha før jeg mister karakteren?');
      expect(sources.length).toBeGreaterThanOrEqual(1);
      expect(sources.every((source) => getInfoSource(source.sourceId)?.topics.includes('fravaer'))).toBe(true);
    }
  });
});

describe('fallbackSources', () => {
  it('matches the question to topics', () => {
    const cases: Array<[string, string]> = [
      ['Hvordan søker jeg læreplass?', 'soke'],
      ['Hva gjør et opplæringskontor?', 'opplaeringskontor'],
      ['Når tar man fagprøven?', 'fagbrev'],
      ['Kan jeg få stipend fra Lånekassen?', 'okonomi'],
      ['Hva er fraværsgrensen?', 'fravaer'],
      ['Kan jeg ta påbygg etterpå?', 'veier'],
    ];
    for (const [question, topic] of cases) {
      const [best] = fallbackSources(question);
      expect(getInfoSource(best.sourceId)?.topics, question).toContain(topic);
    }
  });

  it('always returns at least one real source, also for unrelated questions', () => {
    const sources = fallbackSources('Hva er hovedstaden i Frankrike?');
    expect(sources).toHaveLength(1);
    expect(sources[0].sourceId).toBe(GENERAL_SOURCE_ID);
    expect(sources[0].url).toBe(getInfoSource(GENERAL_SOURCE_ID)!.url);
  });
});
