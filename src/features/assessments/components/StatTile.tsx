import type { ReactNode } from 'react';
import { Card } from '@/components/ui';

export interface StatTileProps {
  label: string;
  /** The big number, e.g. "3" or "4,2". */
  value: string;
  /** Read instead of `value` by screen readers when the number needs words around it. */
  valueLabel?: string;
  /** A short line under the number. */
  note?: ReactNode;
  className?: string;
}

/** A small summary figure: label, number in the display font, one line of context. */
export function StatTile({ label, value, valueLabel, note, className }: StatTileProps) {
  return (
    <Card className={className}>
      <p className="text-small font-semibold text-ink-2">{label}</p>
      <p className="nums mt-1 font-display text-display font-semibold tracking-tight text-ink">
        {valueLabel ? (
          <>
            <span aria-hidden>{value}</span>
            <span className="sr-only">{valueLabel}</span>
          </>
        ) : (
          value
        )}
      </p>
      {note ? <div className="mt-1 text-caption text-ink-2">{note}</div> : null}
    </Card>
  );
}
