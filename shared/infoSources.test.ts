import { describe, expect, it } from 'vitest';
import { INFO_SOURCES, INFO_TOPIC_IDS, infoSourcesForTopic } from './infoSources';

describe('INFO_SOURCES', () => {
  it('has 12–18 sources with unique ids and URLs', () => {
    expect(INFO_SOURCES.length).toBeGreaterThanOrEqual(12);
    expect(INFO_SOURCES.length).toBeLessThanOrEqual(18);
    expect(new Set(INFO_SOURCES.map((source) => source.id)).size).toBe(INFO_SOURCES.length);
    expect(new Set(INFO_SOURCES.map((source) => source.url)).size).toBe(INFO_SOURCES.length);
  });

  it('covers every topic', () => {
    for (const topic of INFO_TOPIC_IDS) {
      expect(infoSourcesForTopic(topic).length, topic).toBeGreaterThanOrEqual(1);
    }
  });

  it('has complete, well-formed entries', () => {
    for (const source of INFO_SOURCES) {
      expect(source.id, source.id).toMatch(/^[a-z0-9-]+$/);
      expect(source.url, source.id).toMatch(/^https:\/\/[a-z0-9.-]+\.no\//);
      expect(source.title.trim().length, source.id).toBeGreaterThan(3);
      expect(source.publisher.trim().length, source.id).toBeGreaterThan(2);
      expect(source.summary.length, source.id).toBeGreaterThan(80);
      expect(source.topics.length, source.id).toBeGreaterThanOrEqual(1);
      expect(source.topics.every((topic) => INFO_TOPIC_IDS.includes(topic)), source.id).toBe(true);
    }
  });
});
