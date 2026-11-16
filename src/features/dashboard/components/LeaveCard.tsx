import type { PlannedTrip } from '@shared/types';
import {
  ArrowRight,
  CalendarDays,
  CalendarOff,
  Clock,
  House,
  RotateCw,
  Route,
  TriangleExclamationPoint,
  WifiOff,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Badge, Button, ButtonLink, Card, cn, Skeleton, Spinner } from '@/components/ui';
import {
  daysUntil,
  formatCountdown,
  formatDayShort,
  formatTime,
  formatWeekday,
  toDate,
} from '@/lib/date';
import { tween } from '@/lib/motion';
import { useDailyPlan, type DailyPlan } from '@/features/travel/useDailyPlan';
import type { TravelDay } from '../logic/schedule';
import { delayHint, hasRealtime, tripSummary } from '../logic/trip';

export interface LeaveCardProps {
  day: TravelDay;
  now: Date;
}

/** "I morgen", "Torsdag", "man. 23. nov." – which day the card plans for. */
function dayBadgeLabel(date: string, now: Date): string {
  const days = daysUntil(date, now);
  const label = days === 1 ? 'i morgen' : days <= 6 ? formatWeekday(date) : formatDayShort(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * "Når må jeg dra?" – when to leave home for the first class. Every state keeps the same
 * frame (heading, body, link to /reise) and the loading skeleton has the shape of the
 * ready body, so nothing below the card moves when the trip arrives.
 */
export function LeaveCard({ day, now }: LeaveCardProps) {
  const plan = useDailyPlan(day.date);
  const headingId = useId();

  // Fade the body only when the state changes after the first paint; on first paint the
  // page entrance already brings the card in.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(true);
  }, []);

  return (
    <Card as="section" aria-labelledby={headingId} aria-busy={plan.status === 'loading' || plan.refreshing}>
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h2 id={headingId} className="text-heading font-semibold text-ink">
          Når må jeg dra?
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {plan.refreshing ? <Spinner size="sm" label="Oppdaterer reisen" className="text-ink-2" /> : null}
          {day.isToday ? null : (
            <Badge tone="neutral" icon={<CalendarDays />}>
              {dayBadgeLabel(day.date, now)}
            </Badge>
          )}
        </div>
      </div>

      <motion.div
        key={plan.status}
        initial={settled ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={tween.base}
        className="mt-3"
      >
        <PlanBody plan={plan} day={day} now={now} />
      </motion.div>

      {plan.status === 'missing_address' ? null : (
        <div className="mt-2 -mb-1 -ml-3">
          <ButtonLink to="/reise" variant="ghost" size="sm" iconRight={<ArrowRight />}>
            Se hele reisen
          </ButtonLink>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- body per status

function PlanBody({ plan, day, now }: { plan: DailyPlan; day: TravelDay; now: Date }) {
  switch (plan.status) {
    case 'loading':
      return <PlanSkeleton />;
    case 'missing_address':
      return (
        <Notice icon={<House />} title="Vi mangler en adresse">
          <p>Legg inn hjemme- og skoleadressen din, så regner vi ut når du må dra.</p>
          <ButtonLink to="/innstillinger" variant="soft" size="sm" className="mt-3">
            Legg inn adresse
          </ButtonLink>
        </Notice>
      );
    case 'error':
      return (
        <Notice icon={<WifiOff />} title="Fikk ikke hentet reisen" tone="danger" role="alert">
          <p>{plan.error?.message ?? 'Sjekk nettet og prøv igjen.'}</p>
          <Button variant="secondary" size="sm" icon={<RotateCw />} onClick={plan.refresh} className="mt-3">
            Prøv igjen
          </Button>
        </Notice>
      );
    case 'no_classes':
      return (
        <Notice icon={<CalendarOff />} title="Ingen timer å rekke">
          <p>Du har ingen timer de neste ukene, så det er ingen reise å planlegge.</p>
        </Notice>
      );
    case 'ready':
      return <ReadyBody plan={plan} day={day} now={now} />;
  }
}

function ReadyBody({ plan, day, now }: { plan: DailyPlan; day: TravelDay; now: Date }) {
  const trip = plan.toSchool;

  if (!trip) {
    return (
      <Notice icon={<House />} title="Ingen reise trengs">
        <p>Første time er rett ved der du bor.</p>
      </Notice>
    );
  }

  const pattern = trip.pattern;
  if (!pattern) {
    return <Warning>{trip.warning ?? 'Vi fant ingen reise som passer før første time.'}</Warning>;
  }

  const leave = toDate(pattern.startTime);
  const delay = delayHint(pattern);
  const showCountdown = day.isToday && leave.getTime() > now.getTime();

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2 font-display font-semibold tracking-tight text-ink">
        <span className="text-title">Gå hjemmefra kl.</span>
        <time dateTime={pattern.startTime} className="text-display">
          {formatTime(leave)}
        </time>
        {showCountdown ? (
          <span className="font-sans text-small font-medium text-ink-2 nums">
            {formatCountdown(leave.getTime() - now.getTime())}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-small text-ink-2 nums">{tripSummary(pattern)}</p>

      {trip.fit !== 'in_window' && trip.warning ? <Warning className="mt-3">{trip.warning}</Warning> : null}

      {delay ? (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-info-soft p-3 text-small text-info-soft-ink">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{delay}. Tidene over er oppdatert.</span>
        </p>
      ) : hasRealtime(pattern) ? (
        <p className="mt-2 text-caption text-ink-3">Sanntid fra Entur</p>
      ) : null}

      <LaterTrips between={plan.between} />
    </div>
  );
}

/** Thursday's YFF: a second trip during the day is worth a heads-up. */
function LaterTrips({ between }: { between: PlannedTrip[] }) {
  const next = between[0];
  if (!next) return null;
  const at = next.pattern?.startTime ?? next.targetTime;
  return (
    <p className="mt-3 flex items-start gap-2 text-small text-ink-2">
      <Route aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        Du skal også reise videre kl. <time dateTime={at}>{formatTime(at)}</time> i løpet av dagen.
      </span>
    </p>
  );
}

// ---------------------------------------------------------------- building blocks

function Warning({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-md bg-accent-soft p-3 text-small text-accent-soft-ink',
        className,
      )}
    >
      <TriangleExclamationPoint aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function Notice({
  icon,
  title,
  children,
  tone = 'neutral',
  role,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  tone?: 'neutral' | 'danger';
  role?: 'alert';
}) {
  return (
    <div role={role} className="flex items-start gap-3">
      <span
        aria-hidden
        className={
          tone === 'danger'
            ? 'grid size-10 shrink-0 place-items-center rounded-md bg-danger-soft text-danger-soft-ink [&_svg]:size-5'
            : 'grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-ink-2 [&_svg]:size-5'
        }
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-small text-ink-2">
        <p className="text-body font-semibold text-ink">{title}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

/** Same rhythm as the ready body: the big line, then one summary line. */
function PlanSkeleton() {
  return (
    <div>
      <span className="sr-only">Henter reisen</span>
      <div className="flex h-9 items-center gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      {/* The summary wraps to two lines on a phone and fits on one on desktop. */}
      <div className="mt-1 flex h-10 flex-col justify-center gap-2 desktop:h-5">
        <Skeleton className="h-3.5 w-11/12 desktop:w-4/5" />
        <Skeleton className="h-3.5 w-2/5 desktop:hidden" />
      </div>
    </div>
  );
}
