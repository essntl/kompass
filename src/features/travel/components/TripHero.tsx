import type { TripFit, TripPattern, TripPurpose } from '@shared/types';
import { Clock, Footprints, TriangleAlert } from 'lucide-react';
import { Fragment } from 'react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatCountdown, formatDuration, formatTime } from '@/lib/date';
import { formatDistance, transitLegs, tripMinutes } from '../lib/format';
import { modeIcon, modeLabel } from '../lib/modes';

export interface TripHeroProps {
  purpose: TripPurpose;
  pattern: TripPattern;
  fit: TripFit;
  minutesEarly?: number;
  warning?: string;
  /** The class the trip is for (to_school/between). */
  eventTitle?: string;
  /** Shows the countdown and "Har gått" when the day is today. */
  now: Date | null;
  /** `primary` for the day's main trip, `default` for the others. */
  tone?: 'primary' | 'default';
}

const LEAVE_LABEL: Record<TripPurpose, string> = {
  to_school: 'Gå hjemmefra kl.',
  between: 'Dra videre kl.',
  home: 'Dra hjem kl.',
};

function arrivalLine(props: TripHeroProps): string {
  const arrive = formatTime(props.pattern.endTime);
  if (props.purpose === 'home') return `Du er hjemme ${arrive}`;
  const minutes = props.minutesEarly;
  const what = props.eventTitle ?? 'timen';
  if (minutes === undefined) return `Du er fremme ${arrive}`;
  if (minutes > 0) return `Du er fremme ${arrive} – ${minutes} min før ${what}`;
  if (minutes === 0) return `Du er fremme ${arrive} – akkurat når ${what} starter`;
  return `Du er fremme ${arrive} – ${Math.abs(minutes)} min etter at ${what} har startet`;
}

/** The answer to "when do I leave?", in the display font. */
export function TripHero(props: TripHeroProps) {
  const { pattern, purpose, warning, now, tone = 'primary' } = props;
  const primary = tone === 'primary';
  const leavesIn = now ? Date.parse(pattern.startTime) - now.getTime() : null;
  const gone = leavesIn !== null && leavesIn < -60_000;
  const modes = transitLegs(pattern);
  const quiet = primary ? 'text-primary-ink/80' : 'text-ink-2';

  return (
    <Card tone={primary ? 'primary' : 'default'} padding="lg">
      {leavesIn !== null ? (
        <p className={cn('mb-1 text-small font-semibold', quiet)}>
          {gone ? 'Denne avgangen har gått' : leavesIn < 60_000 ? 'Gå nå' : `Gå ${formatCountdown(leavesIn)}`}
        </p>
      ) : null}
      <p className="font-display text-title font-semibold tracking-tight desktop:text-display">
        {LEAVE_LABEL[purpose]}{' '}
        <span className="text-display tabular-nums desktop:text-hero">{formatTime(pattern.startTime)}</span>
      </p>
      <p className={cn('mt-2 text-body', primary ? 'text-primary-ink' : 'text-ink')}>
        <span className="tabular-nums">{arrivalLine(props)}</span>
      </p>

      <ul className={cn('mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-small', quiet)}>
        <li className="inline-flex items-center gap-1.5">
          <Clock aria-hidden className="size-4" />
          <span className="tabular-nums">{formatDuration(tripMinutes(pattern))}</span>
        </li>
        {pattern.walkDistance > 0 ? (
          <li className="inline-flex items-center gap-1.5">
            <Footprints aria-hidden className="size-4" />
            <span className="tabular-nums">Gå {formatDistance(pattern.walkDistance)}</span>
          </li>
        ) : null}
        {modes.length > 0 ? (
          <li className="inline-flex items-center gap-1">
            {modes.map((leg, index) => {
              const Icon = modeIcon(leg.mode);
              return (
                <Fragment key={index}>
                  {index > 0 ? <span aria-hidden>›</span> : null}
                  <span className="inline-flex items-center gap-0.5 font-semibold">
                    <Icon aria-hidden className="size-4" />
                    <span className="sr-only">{modeLabel(leg.mode)}</span>
                    <span className="tabular-nums">{leg.line?.publicCode}</span>
                  </span>
                </Fragment>
              );
            })}
          </li>
        ) : null}
      </ul>

      {warning ? (
        <p
          role={props.fit === 'late' ? 'alert' : undefined}
          className="mt-4 flex items-start gap-2 rounded-md bg-accent-soft px-3 py-2.5 text-small font-medium text-accent-soft-ink"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{warning}</span>
        </p>
      ) : null}
    </Card>
  );
}
