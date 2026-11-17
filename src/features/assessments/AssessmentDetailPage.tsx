import type { Assessment } from '@shared/types';
import {
  CalendarDays,
  Check,
  MessageCircle,
  MessageSquareQuote,
  SearchX,
  Sprout,
  Target,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import {
  Avatar,
  ButtonLink,
  Card,
  EmptyState,
  Page,
  PageHeader,
  Section,
  useIsDesktop,
} from '@/components/ui';
import { formatDate, formatDayLong } from '@/lib/date';
import { useNow } from '@/lib/timetable';
import { useAssessment } from '@/stores/assessments';
import { useMessagesStore, useTeacher } from '@/stores/messages';
import { useSubjectMap } from '@/stores/timetable';
import { GradeTile } from './components/GradeTile';
import { KIND_ICONS } from './components/kindIcons';
import { StatusBadge } from './components/StatusBadge';
import { SubjectTag } from './components/SubjectTag';
import { SubmitToggle } from './components/SubmitToggle';
import { subjectOrUnknown } from './logic/groups';
import { GRADE_DESCRIPTIONS, KIND_LABELS, pendingText } from './logic/labels';
import { assessmentStatus, isHandIn } from './logic/status';

export function AssessmentDetailPage() {
  const { assessmentId } = useParams();
  const assessment = useAssessment(assessmentId);

  if (!assessment) {
    return (
      <Page>
        <PageHeader title="Fant ikke vurderingen" back="/vurderinger" />
        <EmptyState
          icon={<SearchX />}
          title="Denne vurderingen finnes ikke"
          description="Den kan være fjernet, eller lenken kan være feil. Du finner alle vurderingene dine i oversikten."
          action={<ButtonLink to="/vurderinger">Se alle vurderinger</ButtonLink>}
        />
      </Page>
    );
  }
  return <AssessmentDetail assessment={assessment} />;
}

function AssessmentDetail({ assessment }: { assessment: Assessment }) {
  const isDesktop = useIsDesktop();
  const now = useNow(60_000);
  const subjects = useSubjectMap();
  const subject = subjectOrUnknown(subjects, assessment.subjectId);
  const teacher = useTeacher(assessment.teacherId);
  const threadId = useMessagesStore((s) =>
    assessment.teacherId ? s.threads.find((t) => t.teacherId === assessment.teacherId)?.id : undefined,
  );
  const status = assessmentStatus(assessment, now);
  const result = assessment.result;
  const backTo = result ? '/vurderinger?vis=vurdert' : '/vurderinger';

  const facts = (
    <Card padding="lg" className="flex flex-col gap-5">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 desktop:grid-cols-1">
        <Fact icon={<KindIcon assessment={assessment} />} label="Type">
          {KIND_LABELS[assessment.kind]}
        </Fact>
        <Fact icon={<CalendarDays />} label={isHandIn(assessment) ? 'Frist' : 'Dato'}>
          <time dateTime={assessment.date}>
            {formatDayLong(assessment.date)}
          </time>
          {assessment.time ? <span className="nums"> kl. {assessment.time}</span> : null}
        </Fact>
      </dl>

      {teacher ? (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-3">
            <Avatar name={teacher.name} color={teacher.color} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{teacher.name}</p>
              <p className="truncate text-small text-ink-2">{teacher.role}</p>
            </div>
          </div>
          <ButtonLink
            to={threadId ? `/meldinger/${threadId}` : '/meldinger'}
            variant="secondary"
            icon={<MessageCircle />}
            fullWidth
          >
            Send melding til {teacher.name.split(' ')[0]}
          </ButtonLink>
        </div>
      ) : null}
    </Card>
  );

  return (
    <Page width="wide">
      <PageHeader title={assessment.title} back={backTo} />

      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-[minmax(0,1fr)_320px] desktop:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <SubjectTag subject={subject} />
          </div>

          {result ? (
            <ResultCard assessment={assessment} />
          ) : (
            <PendingCard assessment={assessment} now={now} />
          )}

          {result?.feedback ? (
            <Section title="Tilbakemelding">
              <Card className="flex items-start gap-3">
                <MessageSquareQuote aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-2" />
                <p className="text-body text-ink">{result.feedback}</p>
              </Card>
            </Section>
          ) : null}

          {result?.nextSteps ? (
            <Section title="Slik kan du bli bedre">
              <Card tone="primary-soft" className="flex items-start gap-3">
                <Sprout aria-hidden className="mt-0.5 size-5 shrink-0" />
                <p className="text-body">{result.nextSteps}</p>
              </Card>
            </Section>
          ) : null}

          {!isDesktop ? facts : null}

          {assessment.description ? (
            <Section title="Om vurderingen">
              <p className="text-body text-ink">{assessment.description}</p>
            </Section>
          ) : null}

          {assessment.goals && assessment.goals.length > 0 ? (
            <Section title="Kompetansemål">
              <p className="-mt-1 text-small text-ink-2">Dette blir du vurdert på, fritt gjengitt fra læreplanen.</p>
              <ul className="flex flex-col gap-2.5">
                {assessment.goals.map((goal) => (
                  <li key={goal} className="flex items-start gap-3 text-body text-ink">
                    <Target aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        {isDesktop ? (
          <aside aria-label="Detaljer" className="sticky top-8 self-start">
            {facts}
          </aside>
        ) : null}
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- parts

function ResultCard({ assessment }: { assessment: Assessment }) {
  const result = assessment.result;
  if (!result) return null;
  const grade = result.grade;
  return (
    <Card padding="lg" className="flex items-center gap-5">
      <GradeTile grade={grade} size="lg" />
      <div className="min-w-0">
        <p className="text-small font-semibold text-ink-2">{grade ? 'Karakter' : 'Vurdert'}</p>
        <p className="text-heading font-semibold text-ink">
          {grade ? GRADE_DESCRIPTIONS[grade] : 'Uten karakter'}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-small text-ink-2">
          <Check aria-hidden className="size-4 shrink-0" />
          <span>
            Vurdert <time dateTime={result.assessedAt}>{formatDate(result.assessedAt)}</time>
          </span>
        </p>
      </div>
    </Card>
  );
}

function PendingCard({ assessment, now }: { assessment: Assessment; now: Date }) {
  const status = assessmentStatus(assessment, now);
  const handIn = isHandIn(assessment);
  const { heading, body } = pendingText(assessment, now);

  return (
    <Card
      padding="lg"
      tone={status === 'overdue' ? 'default' : 'sunken'}
      className={status === 'overdue' ? 'border-danger' : undefined}
    >
      <div className="flex flex-col gap-1">
        <p className="font-display text-title font-semibold tracking-tight text-ink first-letter:uppercase">
          {heading}
        </p>
        <p className="text-body text-ink-2">{body}</p>
      </div>
      {handIn ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={status} handIn />
          <SubmitToggle assessment={assessment} size="md" className="ml-auto" />
        </div>
      ) : null}
    </Card>
  );
}

function KindIcon({ assessment }: { assessment: Assessment }) {
  const Icon = KIND_ICONS[assessment.kind];
  return <Icon />;
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-sm bg-surface-2 text-ink-2 [&_svg]:size-4"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-caption font-semibold tracking-wide text-ink-2 uppercase">{label}</dt>
        <dd className="mt-0.5 text-body text-ink">{children}</dd>
      </div>
    </div>
  );
}
