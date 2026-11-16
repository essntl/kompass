import { ArrowRight, Route } from 'lucide-react';
import { useLocation } from 'react-router';
import { ButtonLink, Card, Page, PageHeader, Section, Stagger, StaggerItem } from '@/components/ui';
import { AskPanel } from './components/AskPanel';
import { TopicCard } from './components/TopicCard';
import { INFO_TOPICS } from './data/topics';

/** Router state set by topic pages that start a question here. */
export interface InfoPageState {
  revealThread?: boolean;
}

/** /info – the assistant, the map of education paths and the eight topics. */
export function InfoPage() {
  const location = useLocation();
  const revealThread = Boolean((location.state as InfoPageState | null)?.revealThread);

  return (
    <Page>
      <PageHeader
        title="Info-hjørnet"
        subtitle="Svar på det du lurer på om læreplass, fagbrev og rettighetene dine."
      />

      <AskPanel revealThread={revealThread} />

      <Card tone="primary-soft" padding="lg" className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-md bg-surface text-primary">
          <Route className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Hvor kan yrkesfag ta deg?</p>
          <p className="mt-0.5 text-small">
            Se veien fra Vg1 til fagbrev, og hva du kan gjøre etterpå.
          </p>
        </div>
        <ButtonLink to="/info/veier" variant="primary" iconRight={<ArrowRight />} className="self-start sm:self-auto">
          Se utdanningsveiene
        </ButtonLink>
      </Card>

      <Section title="Temaer">
        <Stagger as="ul" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INFO_TOPICS.map((topic) => (
            <StaggerItem as="li" key={topic.id}>
              <TopicCard topic={topic} />
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </Page>
  );
}
