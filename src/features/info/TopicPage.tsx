import { infoSourcesForTopic } from '@shared/infoSources';
import { ArrowRight, SearchX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import {
  ButtonLink,
  Card,
  Chip,
  ChipGroup,
  cn,
  EmptyState,
  Page,
  PageHeader,
  Section,
  subjectColor,
} from '@/components/ui';
import { SourceCard } from './components/SourceCard';
import { TextBlocks } from './components/TextBlocks';
import { VideoCard } from './components/VideoCard';
import { getInfoTopic } from './data/topics';
import { TOPIC_VIDEOS } from './data/videos';
import type { InfoPageState } from './InfoPage';
import { useInfoChat } from './useInfoChat';

/** /info/tema/:topicId – explainer, questions for the assistant, sources and videos. */
export function TopicPage() {
  const { topicId } = useParams();
  const topic = getInfoTopic(topicId);
  const navigate = useNavigate();
  const ask = useInfoChat((state) => state.ask);

  if (!topic) {
    return (
      <Page>
        <PageHeader title="Fant ikke temaet" back="/info" />
        <EmptyState
          icon={<SearchX />}
          title="Dette temaet finnes ikke"
          description="Lenken kan være feil. Gå tilbake til Info-hjørnet og velg et tema der."
          action={<ButtonLink to="/info">Til Info-hjørnet</ButtonLink>}
        />
      </Page>
    );
  }

  const color = subjectColor(topic.color);
  const Icon = topic.icon;
  const sources = infoSourcesForTopic(topic.id);
  const videos = TOPIC_VIDEOS[topic.id];

  function askAbout(question: string) {
    if (!ask(question)) return;
    const state: InfoPageState = { revealThread: true };
    navigate('/info', { state });
  }

  return (
    <Page>
      <PageHeader title={topic.title} subtitle={topic.lead} back="/info" />

      <Card padding="lg" className="flex flex-col gap-4">
        <span aria-hidden className={cn('grid size-11 place-items-center rounded-md', color.soft, color.ink)}>
          <Icon className="size-5" />
        </span>
        <TextBlocks blocks={topic.explainer} />
        {topic.id === 'veier' ? (
          <ButtonLink to="/info/veier" variant="soft" iconRight={<ArrowRight />} className="self-start">
            Se kartet over utdanningsveiene
          </ButtonLink>
        ) : null}
      </Card>

      <Section title="Spør om dette">
        <p className="-mt-1 text-small text-ink-2">Trykk på et spørsmål, så svarer veilederen i Info-hjørnet.</p>
        <ChipGroup label={`Spørsmål om ${topic.title.toLowerCase()}`}>
          {topic.questions.map((question) => (
            <Chip key={question} onClick={() => askAbout(question)}>
              {question}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="Les mer hos kildene">
        <ul className="grid grid-cols-1 gap-2">
          {sources.map((source) => (
            <li key={source.id}>
              <SourceCard
                title={source.title}
                url={source.url}
                publisher={source.publisher}
                why={source.summary}
                clamp
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title={videos.length > 1 ? 'Videoer' : 'Video'}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {videos.map((video, index) => (
            <li key={video.kind === 'youtube' ? video.youtubeId : `placeholder-${index}`}>
              <VideoCard video={video} />
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
