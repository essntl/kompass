import type { PortfolioEntry, Subject } from '@shared/types';
import { useRef, type MouseEvent } from 'react';
import { Link } from 'react-router';
import { Card, cn } from '@/components/ui';
import { formatDayShort } from '@/lib/date';
import { launchFlight, RADII } from '../photoFlight';
import { isModifiedClick } from './EntryCard';
import { EntryPhoto } from './EntryPhoto';
import { SelectionMark } from './SelectionMark';
import { SubjectTag } from './SubjectTag';

export interface EntryRowProps {
  entry: PortfolioEntry;
  subject?: Subject;
  selecting: boolean;
  selected: boolean;
  blocked: boolean;
  onToggle: (id: string) => void;
}

/** One entry on the timeline: thumbnail, title, day, subject and the start of the note. */
export function EntryRow({ entry, subject, selecting, selected, blocked, onToggle }: EntryRowProps) {
  const photoRef = useRef<HTMLDivElement>(null);

  const body = (
    <div className="flex items-start gap-3 desktop:gap-4">
      <EntryPhoto
        ref={photoRef}
        entryId={entry.id}
        shape="thumb"
        photo={entry.photo}
        alt=""
        subject={subject}
        size="sm"
        className="w-24 shrink-0 rounded-md desktop:w-32"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 font-semibold text-ink">{entry.title}</p>
          {selecting ? <SelectionMark selected={selected} className="-mt-0.5 shrink-0" /> : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <time dateTime={entry.date} className="text-small text-ink-2">
            {formatDayShort(entry.date)}
          </time>
          {subject ? <SubjectTag subject={subject} /> : null}
        </div>
        <p className="mt-0.5 line-clamp-2 text-small text-ink-2">{entry.note}</p>
      </div>
    </div>
  );

  const shared = cn(selected && 'ring-2 ring-primary', blocked && 'opacity-55');

  if (selecting) {
    return (
      <Card
        as="button"
        type="button"
        interactive
        padding="none"
        aria-pressed={selected}
        aria-disabled={blocked || undefined}
        onClick={() => onToggle(entry.id)}
        className={cn('p-3', shared)}
      >
        {body}
      </Card>
    );
  }

  return (
    <Card
      as={Link}
      to={`/portefolje/${entry.id}`}
      interactive
      padding="none"
      onClick={(event: MouseEvent) => {
        if (!isModifiedClick(event)) launchFlight(entry.id, photoRef.current, RADII.thumb);
      }}
      className={cn('p-3', shared)}
    >
      {body}
    </Card>
  );
}
