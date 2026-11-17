import type { Assessment, Subject } from '@shared/types';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Card, cn, subjectColor } from '@/components/ui';
import { formatDayShort } from '@/lib/date';
import { GRADE_DESCRIPTIONS, KIND_LABELS } from '../logic/labels';
import { GradeTile } from './GradeTile';

export interface AssessedCardProps {
  assessment: Assessment;
  subject: Subject;
}

/** An assessed item: grade first, then what it was and the start of the feedback. */
export function AssessedCard({ assessment, subject }: AssessedCardProps) {
  const result = assessment.result;
  const grade = result?.grade;
  const color = subjectColor(subject.color);

  return (
    <Card
      as={Link}
      to={`/vurderinger/${assessment.id}`}
      interactive
      className="flex h-full flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <GradeTile grade={grade} />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 text-small text-ink-2">
            <span aria-hidden className={cn('size-2 shrink-0 rounded-full', color.solid)} />
            <span className="truncate">
              {subject.name} · {KIND_LABELS[assessment.kind]}
            </span>
          </p>
          <h3 className="font-semibold text-ink">{assessment.title}</h3>
          <p className="mt-0.5 text-small text-ink-2">
            {grade ? GRADE_DESCRIPTIONS[grade] : 'Uten karakter'}
            {result ? (
              <>
                {' · '}
                <span className="nums">
                  Vurdert <time dateTime={result.assessedAt}>{formatDayShort(result.assessedAt)}</time>
                </span>
              </>
            ) : null}
          </p>
        </div>
        <ChevronRight aria-hidden className="-mr-1 mt-3 size-5 shrink-0 text-ink-3" />
      </div>
      {result?.feedback ? (
        <p className="line-clamp-2 border-t border-line pt-3 text-small text-ink-2">{result.feedback}</p>
      ) : null}
    </Card>
  );
}
