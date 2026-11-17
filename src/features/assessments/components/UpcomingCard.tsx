import type { Assessment, Subject } from '@shared/types';
import { Clock } from 'lucide-react';
import { Link } from 'react-router';
import { Badge, Card, cn } from '@/components/ui';
import { daysUntil } from '@/lib/date';
import { daysLeftLabel, KIND_LABELS, whenLabel } from '../logic/labels';
import { assessmentStatus, isHandIn } from '../logic/status';
import { KindTile } from './KindTile';
import { StatusBadge } from './StatusBadge';
import { SubmitToggle } from './SubmitToggle';

/** Days ahead that get the amber "soon" badge. */
const SOON_DAYS = 7;

export interface UpcomingCardProps {
  assessment: Assessment;
  subject: Subject;
  now: Date;
}

/**
 * An assessment without a result: coming up, handed in, overdue or waiting for the teacher.
 * The title is a link stretched over the card; the hand-in button sits above it, so the
 * card holds two separate targets instead of a button nested in a link.
 */
export function UpcomingCard({ assessment, subject, now }: UpcomingCardProps) {
  const status = assessmentStatus(assessment, now);
  const days = daysUntil(assessment.date, now);
  const future = status === 'upcoming' || (status === 'submitted' && days >= 0);
  const handIn = isHandIn(assessment);

  return (
    <Card
      padding="none"
      className={cn(
        'relative flex h-full flex-col gap-3 p-4',
        'transition-[scale,background-color,border-color] duration-150 ease-out',
        'hover:border-line-strong hover:bg-surface-hover has-[a:active]:scale-[0.98]',
        status === 'overdue' && 'border-danger',
      )}
    >
      <div className="flex items-start gap-3">
        <KindTile kind={assessment.kind} subject={subject} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-small text-ink-2">
            {subject.name} · {KIND_LABELS[assessment.kind]}
          </p>
          <h3 className="font-semibold text-ink">
            <Link
              to={`/vurderinger/${assessment.id}`}
              className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-solid focus-visible:after:outline-(color:--focus-ring)"
            >
              {assessment.title}
            </Link>
          </h3>
          <p className="nums mt-0.5 text-small text-ink-2">
            <time dateTime={assessment.date}>{whenLabel(assessment)}</time>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {future ? (
          days <= SOON_DAYS ? (
            <Badge tone="accent" icon={<Clock />}>
              <span className="sr-only">Snart: </span>
              {daysLeftLabel(assessment, now)}
            </Badge>
          ) : (
            <Badge tone="neutral" icon={<Clock />}>
              {daysLeftLabel(assessment, now)}
            </Badge>
          )
        ) : null}
        {status !== 'upcoming' || handIn ? <StatusBadge status={status} handIn={handIn} /> : null}
        {handIn ? (
          <SubmitToggle assessment={assessment} className="relative z-10 ml-auto" />
        ) : null}
      </div>
    </Card>
  );
}
