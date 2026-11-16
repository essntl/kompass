import type { TripSituation } from '@shared/types';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { Collapse } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface SituationListProps {
  situations: TripSituation[];
}

/** Disruption notices on a leg (from Entur), each expandable when it has more text. */
export function SituationList({ situations }: SituationListProps) {
  if (situations.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1.5" aria-label="Avvik">
      {situations.map((situation) => (
        <SituationItem key={situation.summary} situation={situation} />
      ))}
    </ul>
  );
}

function SituationItem({ situation }: { situation: TripSituation }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const expandable = Boolean(situation.description);

  const content = (
    <>
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 flex-1 text-small font-medium">{situation.summary}</span>
      {expandable ? (
        <ChevronDown
          aria-hidden
          className={cn(
            'mt-0.5 size-4 shrink-0 transition-transform duration-200 ease-out',
            open && 'rotate-180',
          )}
        />
      ) : null}
    </>
  );

  return (
    <li className="rounded-md bg-accent-soft text-accent-soft-ink">
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-11 w-full items-start gap-2 rounded-md px-3 py-2.5 text-left transition-[scale] duration-150 ease-out active:scale-[0.99]"
        >
          {content}
        </button>
      ) : (
        <div className="flex items-start gap-2 px-3 py-2.5">{content}</div>
      )}
      {expandable ? (
        <Collapse open={open} id={id}>
          <p className="px-3 pb-3 pl-9 text-small whitespace-pre-line">{situation.description}</p>
        </Collapse>
      ) : null}
    </li>
  );
}
