import { ChevronRight } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { Card, cn, subjectColor } from '@/components/ui';
import { formatDayShort } from '@/lib/date';
import { formatAverage } from '../logic/averages';
import type { SubjectSummary } from '../logic/groups';
import { KIND_LABELS } from '../logic/labels';
import { assessmentStatus, isHandIn } from '../logic/status';
import { GradeHistory } from './GradeHistory';
import { StatusBadge } from './StatusBadge';

export interface SubjectCardProps {
  summary: SubjectSummary;
  now: Date;
}

/** One subject: its average so far, the grade history and every assessment in it. */
export function SubjectCard({ summary, now }: SubjectCardProps) {
  const { subject, assessments, history, average } = summary;
  const color = subjectColor(subject.color);
  const headingId = useId();

  return (
    <Card as="section" aria-labelledby={headingId} className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="flex items-start gap-2 text-heading font-semibold text-ink">
            <span aria-hidden className={cn('mt-2 size-3 shrink-0 rounded-full', color.solid)} />
            <span className="min-w-0">{subject.name}</span>
          </h3>
          <p className="mt-0.5 text-small text-ink-2">
            {assessments.length === 1 ? '1 vurdering' : `${assessments.length} vurderinger`}
            {summary.upcomingCount > 0 ? ` · ${summary.upcomingCount} kommende` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {average !== null ? (
            <>
              <p className="nums font-display text-title font-semibold text-ink">
                <span className="sr-only">Snitt så langt: </span>
                {formatAverage(average)}
              </p>
              <p className="text-caption text-ink-2">Snitt, ikke offisielt</p>
            </>
          ) : (
            <p className="max-w-28 text-caption text-ink-2">Ingen karakterer ennå</p>
          )}
        </div>
      </div>

      {history.length > 0 ? <GradeHistory points={history} color={subject.color} /> : null}

      <ul className="-mx-2 mt-auto flex flex-col border-t border-line pt-2">
        {assessments.map((a) => {
          const status = assessmentStatus(a, now);
          return (
            <li key={a.id}>
              <Link
                to={`/vurderinger/${a.id}`}
                className="flex min-h-12 items-center gap-3 rounded-sm px-2 py-2 transition-colors duration-150 hover:bg-surface-hover focus-visible:-outline-offset-2 active:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small font-semibold text-ink">{a.title}</span>
                  <span className="nums block text-caption text-ink-2">
                    {KIND_LABELS[a.kind]} · <time dateTime={a.date}>{formatDayShort(a.date)}</time>
                  </span>
                </span>
                {status === 'assessed' ? (
                  a.result?.grade !== undefined ? (
                    <span className="nums grid size-8 shrink-0 place-items-center rounded-sm bg-surface-2 text-small font-semibold text-ink">
                      <span className="sr-only">Karakter </span>
                      {a.result.grade}
                    </span>
                  ) : (
                    <span className="shrink-0 text-caption text-ink-2">Uten karakter</span>
                  )
                ) : (
                  <StatusBadge status={status} handIn={isHandIn(a)} />
                )}
                <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
