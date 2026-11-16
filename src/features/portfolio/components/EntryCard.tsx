import type { PortfolioEntry, Subject } from '@shared/types';
import { useRef, type MouseEvent } from 'react';
import { Link } from 'react-router';
import { Card, cn } from '@/components/ui';
import { formatDate } from '@/lib/date';
import { launchFlight, RADII } from '../photoFlight';
import { EntryPhoto } from './EntryPhoto';
import { SelectionMark } from './SelectionMark';
import { SubjectTag } from './SubjectTag';

export interface EntryCardProps {
  entry: PortfolioEntry;
  subject?: Subject;
  selecting: boolean;
  selected: boolean;
  /** Selection is full and this card is not in it. */
  blocked: boolean;
  onToggle: (id: string) => void;
}

/** True for clicks that open a new tab or window: no transition for those. */
export function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

/** Photo-led card in the portfolio grid. A link to the entry, or a toggle while selecting. */
export function EntryCard({ entry, subject, selecting, selected, blocked, onToggle }: EntryCardProps) {
  const photoRef = useRef<HTMLDivElement>(null);

  const body = (
    <>
      <div className="relative">
        <EntryPhoto
          ref={photoRef}
          entryId={entry.id}
          shape="card"
          photo={entry.photo}
          alt=""
          subject={subject}
        />
        {selecting ? <SelectionMark selected={selected} className="absolute top-2.5 right-2.5" /> : null}
      </div>
      <div className="flex flex-col gap-2 p-3 desktop:p-4">
        <p className="line-clamp-2 font-semibold text-ink">{entry.title}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <time dateTime={entry.date} className="text-small text-ink-2">
            {formatDate(entry.date)}
          </time>
          {subject ? <SubjectTag subject={subject} /> : null}
        </div>
      </div>
    </>
  );

  const shared = cn(
    'h-full overflow-hidden',
    selected && 'ring-2 ring-primary',
    blocked && 'opacity-55',
  );

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
        className={shared}
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
        if (!isModifiedClick(event)) launchFlight(entry.id, photoRef.current, RADII.card);
      }}
      className={shared}
    >
      {body}
    </Card>
  );
}
