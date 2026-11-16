import { describe, expect, it } from 'vitest';
import { INFO_TOPIC_IDS, infoSourcesForTopic } from '@shared/infoSources';
import { INFO_TOPICS, STARTER_QUESTIONS } from './topics';
import { TOPIC_VIDEOS } from './videos';

describe('topics', () => {
  it('has one topic per InfoTopicId, in the curated order', () => {
    expect(INFO_TOPICS.map((topic) => topic.id)).toEqual(INFO_TOPIC_IDS);
  });

  it('gives every topic an explainer, questions and at least one curated source', () => {
    for (const topic of INFO_TOPICS) {
      expect(topic.explainer.length).toBeGreaterThanOrEqual(3);
      expect(topic.questions.length).toBeGreaterThan(0);
      expect(infoSourcesForTopic(topic.id).length).toBeGreaterThan(0);
    }
    expect(STARTER_QUESTIONS.length).toBeGreaterThanOrEqual(4);
  });
});

describe('videos', () => {
  it('has a verified video or a placeholder for every topic', () => {
    for (const id of INFO_TOPIC_IDS) {
      const videos = TOPIC_VIDEOS[id];
      expect(videos.length).toBeGreaterThan(0);
      for (const video of videos) {
        if (video.kind === 'youtube') {
          expect(video.youtubeId).toMatch(/^[A-Za-z0-9_-]{11}$/);
          expect(video.title.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('does not use the same video twice', () => {
    const ids = Object.values(TOPIC_VIDEOS)
      .flat()
      .flatMap((video) => (video.kind === 'youtube' ? [video.youtubeId] : []));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
