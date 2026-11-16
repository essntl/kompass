import { formatTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { delayMinutes, formatDelay } from '../lib/format';

export interface LegTimeProps {
  aimed: string;
  expected: string;
  /** Emphasise (origin/destination or a departure). */
  strong?: boolean;
  className?: string;
}

/**
 * The expected time; when real time moves it, the timetabled time struck through under
 * it with the difference ("+3 min").
 */
export function LegTime({ aimed, expected, strong, className }: LegTimeProps) {
  const delay = delayMinutes(aimed, expected);
  return (
    <span className={cn('flex flex-col items-end leading-tight tabular-nums', className)}>
      <span className={cn('text-body', strong ? 'font-semibold text-ink' : 'text-ink')}>
        <span className="sr-only">{delay !== 0 ? 'Ny tid ' : ''}</span>
        {formatTime(expected)}
      </span>
      {delay !== 0 ? (
        <span className="mt-0.5 flex flex-col items-end text-caption">
          <s className="text-ink-3">
            <span className="sr-only">Rutetid </span>
            {formatTime(aimed)}
          </s>
          <span className={cn('font-semibold', delay > 0 ? 'text-danger' : 'text-success')}>
            {formatDelay(delay)}
          </span>
        </span>
      ) : null}
    </span>
  );
}
