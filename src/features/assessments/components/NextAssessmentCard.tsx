import type { Assessment, Subject } from '@shared/types';
import { CalendarCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Card, EmptyState } from '@/components/ui';
import { daysLeftLabel, KIND_LABELS, whenLabel } from '../logic/labels';

export interface NextAssessmentCardProps {
  assessment: Assessment | undefined;
  subject: Subject | undefined;
  now: Date;
  className?: string;
}

/** The hero of the page: what is next and how long until it. */
export function NextAssessmentCard({ assessment, subject, now, className }: NextAssessmentCardProps) {
  if (!assessment) {
    return (
      <Card className={className}>
        <EmptyState
          size="compact"
          icon={<CalendarCheck />}
          title="Ingen kommende vurderinger"
          description="Du har ingen prøver eller innleveringer på planen akkurat nå."
        />
      </Card>
    );
  }

  return (
    <Card
      as={Link}
      to={`/vurderinger/${assessment.id}`}
      tone="primary"
      padding="lg"
      interactive
      className={className}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-small font-semibold opacity-85">Neste vurdering</p>
          <p className="mt-1 font-display text-display font-semibold tracking-tight">
            <time dateTime={assessment.date}>{daysLeftLabel(assessment, now)}</time>
          </p>
        </div>
        <ChevronRight aria-hidden className="mt-1 size-5 shrink-0 opacity-85" />
      </div>
      <p className="mt-3 text-heading font-semibold">{assessment.title}</p>
      <p className="nums mt-1 text-small opacity-90">
        {[subject?.name, KIND_LABELS[assessment.kind], whenLabel(assessment)].filter(Boolean).join(' · ')}
      </p>
    </Card>
  );
}
