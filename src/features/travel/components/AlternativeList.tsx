import type { TripPattern } from '@shared/types';
import { Check, ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { Collapse } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/date';
import { transitLegs } from '../lib/format';
import { LineBadge } from './LineBadge';

export interface AlternativeListProps {
  /** Every option, including the chosen one, in departure order. */
  options: TripPattern[];
  selectedId: string;
  recommendedId: string | null;
  onSelect: (pattern: TripPattern) => void;
  /** Right-hand detail per row, e.g. "12 min før" or "25 min". */
  detail: (pattern: TripPattern) => { text: string; warn?: boolean };
}

/** "Andre avganger": compact rows, tap one to make it the trip shown above. */
export function AlternativeList({ options, selectedId, recommendedId, onSelect, detail }: AlternativeListProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const others = options.length - 1;
  if (others <= 0) return null;

  return (
    <div className="border-t border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-body font-semibold text-ink',
          'transition-[background-color] duration-150 hover:bg-surface-hover',
          !open && 'rounded-b-lg',
        )}
      >
        <span>
          Andre avganger <span className="font-normal text-ink-2 tabular-nums">({others})</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn('size-5 text-ink-2 transition-transform duration-200 ease-out', open && 'rotate-180')}
        />
      </button>
      <Collapse open={open} id={id}>
        <ul className="flex flex-col px-2 pb-2" aria-label="Andre avganger">
          {options.map((pattern) => {
            const selected = pattern.id === selectedId;
            const info = detail(pattern);
            const legs = transitLegs(pattern);
            return (
              <li key={pattern.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(pattern)}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-3 rounded-md px-2 text-left',
                    'transition-[scale,background-color] duration-150 ease-out active:scale-[0.98]',
                    selected ? 'bg-primary-soft text-primary-soft-ink' : 'text-ink hover:bg-surface-hover',
                  )}
                >
                  <span className="grid size-5 shrink-0 place-items-center">
                    {selected ? <Check aria-hidden className="size-5" /> : null}
                  </span>
                  <span className="w-28 shrink-0 text-body font-semibold tabular-nums">
                    {formatTime(pattern.startTime)} <span aria-hidden>→</span>
                    <span className="sr-only"> til </span> {formatTime(pattern.endTime)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                    {legs.length > 0 ? (
                      legs.map((leg, index) => <LineBadge key={index} leg={leg} size="sm" />)
                    ) : (
                      <span className="text-small text-ink-2">Gå hele veien</span>
                    )}
                    {pattern.id === recommendedId ? (
                      <span className="ml-1 text-caption font-semibold">Forslag</span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-small tabular-nums',
                      info.warn ? 'font-semibold text-accent-soft-ink' : selected ? '' : 'text-ink-2',
                    )}
                  >
                    {info.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Collapse>
    </div>
  );
}
