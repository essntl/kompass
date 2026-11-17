import type { Assessment, Subject } from '@shared/types';
import { ClipboardCheck, Info, TriangleAlert } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import {
  Card,
  EmptyState,
  Page,
  PageHeader,
  Section,
  Stagger,
  StaggerItem,
  TabPanel,
  Tabs,
  useIsDesktop,
} from '@/components/ui';
import { AssessedCard } from './components/AssessedCard';
import { NextAssessmentCard } from './components/NextAssessmentCard';
import { StatTile } from './components/StatTile';
import { SubjectCard } from './components/SubjectCard';
import { UpcomingCard } from './components/UpcomingCard';
import { formatAverage, UNOFFICIAL_AVERAGE_NOTE } from './logic/averages';
import { groupByWeek, subjectOrUnknown, SUMMARY_HORIZON_DAYS } from './logic/groups';
import { formatAssessmentCount } from './logic/labels';
import { useAssessmentOverview } from './useAssessmentOverview';

export type OverviewTab = 'kommende' | 'vurdert' | 'fag';
const TAB_VALUES: readonly OverviewTab[] = ['kommende', 'vurdert', 'fag'];

/** The tab lives in the URL (`?vis=vurdert`), so "Tilbake" from a detail page lands on it. */
function useTab(): [OverviewTab, (tab: OverviewTab) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('vis');
  const tab = TAB_VALUES.find((t) => t === raw) ?? 'kommende';
  const setTab = (next: OverviewTab) =>
    setParams(next === 'kommende' ? {} : { vis: next }, { replace: true, preventScrollReset: true });
  return [tab, setTab];
}

export function AssessmentsPage() {
  const isDesktop = useIsDesktop();
  const tabsId = useId();
  const [tab, setTab] = useTab();
  const { now, subjects, groups, summary, bySubject } = useAssessmentOverview();
  const subjectOf = (a: Assessment) => subjectOrUnknown(subjects, a.subjectId);

  const comingSoonText = `kommer de neste ${SUMMARY_HORIZON_DAYS} dagene`;

  return (
    <Page width="wide">
      <PageHeader title="Vurderinger" subtitle="Prøver, innleveringer og tilbakemeldinger fra lærerne dine." />

      <div className="grid grid-cols-2 gap-3 desktop:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] desktop:gap-4">
        <NextAssessmentCard
          assessment={summary.next}
          subject={summary.next ? subjectOf(summary.next) : undefined}
          now={now}
          className="col-span-2 desktop:col-span-1"
        />
        <StatTile
          label="Neste to uker"
          value={String(summary.comingSoon)}
          valueLabel={`${formatAssessmentCount(summary.comingSoon)} ${comingSoonText}`}
          note={
            <>
              <span aria-hidden>{summary.comingSoon === 1 ? 'vurdering kommer' : 'vurderinger kommer'}</span>
              {summary.overdueCount > 0 ? (
                <span className="mt-1 flex items-start gap-1 font-semibold text-danger-soft-ink">
                  <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  {summary.overdueCount === 1
                    ? '1 innlevering er ikke levert'
                    : `${summary.overdueCount} innleveringer er ikke levert`}
                </span>
              ) : null}
            </>
          }
        />
        <StatTile
          label="Snitt så langt"
          value={summary.average === null ? '–' : formatAverage(summary.average)}
          valueLabel={summary.average === null ? 'Ingen karakterer ennå' : undefined}
          note={summary.average === null ? 'Ingen karakterer ennå' : UNOFFICIAL_AVERAGE_NOTE}
        />
      </div>

      <div className="flex flex-col gap-5">
        <Tabs
          id={tabsId}
          aria-label="Vis vurderinger"
          fullWidth={!isDesktop}
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'kommende', label: 'Kommende', count: groups.overdue.length + groups.upcoming.length },
            { value: 'vurdert', label: 'Vurdert', count: groups.assessed.length },
            { value: 'fag', label: 'Fag' },
          ]}
        />

        <TabPanel tabsId={tabsId} value="kommende" active={tab === 'kommende'}>
          <UpcomingPanel groups={groups} now={now} subjectOf={subjectOf} />
        </TabPanel>

        <TabPanel tabsId={tabsId} value="vurdert" active={tab === 'vurdert'}>
          {groups.assessed.length === 0 ? (
            <Card tone="sunken">
              <EmptyState
                size="compact"
                icon={<ClipboardCheck />}
                title="Ingen vurderinger ennå"
                description="Når læreren har vurdert noe, ser du karakteren og tilbakemeldingen her."
              />
            </Card>
          ) : (
            <Stagger as="ul" aria-label="Vurdert" className="grid grid-cols-1 gap-3 desktop:grid-cols-2">
              {groups.assessed.map((a) => (
                <StaggerItem as="li" key={a.id}>
                  <AssessedCard assessment={a} subject={subjectOf(a)} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </TabPanel>

        <TabPanel tabsId={tabsId} value="fag" active={tab === 'fag'}>
          {bySubject.length === 0 ? (
            <Card tone="sunken">
              <EmptyState
                size="compact"
                icon={<ClipboardCheck />}
                title="Ingen fag med vurderinger ennå"
                description="Når du får prøver og innleveringer, ser du dem samlet per fag her."
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="flex items-start gap-2 text-small text-ink-2">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                {UNOFFICIAL_AVERAGE_NOTE}
              </p>
              <Stagger as="ul" aria-label="Fag" className="grid grid-cols-1 gap-3 desktop:grid-cols-2">
                {bySubject.map((s) => (
                  <StaggerItem as="li" key={s.subject.id}>
                    <SubjectCard summary={s} now={now} />
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          )}
        </TabPanel>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- "Kommende"

function UpcomingPanel({
  groups,
  now,
  subjectOf,
}: {
  groups: ReturnType<typeof useAssessmentOverview>['groups'];
  now: Date;
  subjectOf: (a: Assessment) => Subject;
}) {
  const weeks = groupByWeek(groups.upcoming, now);
  const nothingAhead = groups.overdue.length === 0 && groups.upcoming.length === 0;

  const list = (items: Assessment[], label: string): ReactNode => (
    <ul aria-label={label} className="grid grid-cols-1 gap-3 desktop:grid-cols-2">
      {items.map((a) => (
        <li key={a.id}>
          <UpcomingCard assessment={a} subject={subjectOf(a)} now={now} />
        </li>
      ))}
    </ul>
  );

  return (
    <Stagger className="flex flex-col gap-6">
      {groups.overdue.length > 0 ? (
        <StaggerItem>
          <Section title="Ikke levert">{list(groups.overdue, 'Ikke levert')}</Section>
        </StaggerItem>
      ) : null}

      {nothingAhead ? (
        <StaggerItem>
          <Card tone="sunken">
            <EmptyState
              size="compact"
              icon={<ClipboardCheck />}
              title="Ingen kommende vurderinger"
              description="Når læreren legger inn en prøve eller en innlevering, dukker den opp her."
            />
          </Card>
        </StaggerItem>
      ) : null}

      {weeks.map((week) => (
        <StaggerItem key={week.label}>
          <Section title={week.label}>{list(week.items, week.label)}</Section>
        </StaggerItem>
      ))}

      {groups.awaiting.length > 0 ? (
        <StaggerItem>
          <Section title="Venter på vurdering">{list(groups.awaiting, 'Venter på vurdering')}</Section>
        </StaggerItem>
      ) : null}
    </Stagger>
  );
}
