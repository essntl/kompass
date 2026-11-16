import type { CalendarEvent, ISODate, Place, PlannedTrip } from '@shared/types';
import { CalendarOff, CircleAlert, MapPinOff, RotateCw, SearchX, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  Section,
} from '@/components/ui';
import { formatDayLong, formatTime, todayISO } from '@/lib/date';
import { fade } from '@/lib/motion';
import { useNow } from '@/lib/timetable';
import { useSettingsStore } from '@/stores/settings';
import { useTimetableStore } from '@/stores/timetable';
import { DayPicker } from './components/DayPicker';
import { TravelSkeleton } from './components/TravelSkeleton';
import { TripPlanCard } from './components/TripPlanCard';
import { WalkSpeedControl } from './components/WalkSpeedControl';
import { defaultTravelDay, travelDays } from './lib/days';
import { capitalize } from './lib/format';
import { samePlace, tripsInOrder } from './lib/planDay';
import { useDailyPlanDetails, type DailyPlan } from './useDailyPlan';

const DAY_PARAM = 'dag';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function TravelPage() {
  const now = useNow(30_000);
  const events = useTimetableStore((s) => s.events);
  const todayKey = todayISO();
  // Recomputed when the timetable or the day changes, not on every clock tick.
  const days = useMemo(() => travelDays(events, new Date()), [events, todayKey]);
  const [params, setParams] = useSearchParams();
  const requested = params.get(DAY_PARAM);
  const date: ISODate =
    requested && ISO_DATE.test(requested) ? requested : defaultTravelDay(days, events, now);
  // A day from a link may not be in the picker (e.g. a weekend): show it anyway.
  const pickerDays = days.some((d) => d.date === date)
    ? days
    : [...days, { date, label: capitalize(formatDayLong(date)), hasClasses: true }];

  const { plan, updatedAt, refreshFailed } = useDailyPlanDetails(date);
  const canRefresh = plan.status === 'ready' || plan.status === 'error';

  const subtitle = (
    <>
      {capitalize(formatDayLong(date))}
      {updatedAt && canRefresh ? (
        <span className="tabular-nums"> · oppdatert {formatTime(new Date(updatedAt))}</span>
      ) : null}
    </>
  );

  return (
    <Page>
      <PageHeader
        title="Reise"
        subtitle={subtitle}
        actions={
          canRefresh ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCw />}
              loading={plan.refreshing}
              onClick={plan.refresh}
            >
              Oppdater
            </Button>
          ) : null
        }
      />

      <DayPicker
        days={pickerDays}
        value={date}
        onChange={(next) =>
          setParams(
            (current) => {
              const copy = new URLSearchParams(current);
              copy.set(DAY_PARAM, next);
              return copy;
            },
            { replace: true },
          )
        }
      />

      {refreshFailed && plan.status === 'ready' ? (
        <p role="status" className="-mt-2 flex items-center gap-2 text-small text-ink-2">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          Fikk ikke oppdatert reisen. Du ser tidene fra sist.
        </p>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${date}:${plan.status === 'ready' ? 'ready' : plan.status}`}
          variants={fade}
          initial="hidden"
          animate="show"
          exit="exit"
          className="flex flex-col gap-6"
        >
          <PlanContent plan={plan} date={date} now={now} events={events} />
        </motion.div>
      </AnimatePresence>

      <Card>
        <WalkSpeedControl />
      </Card>
    </Page>
  );
}

interface PlanContentProps {
  plan: DailyPlan;
  date: ISODate;
  now: Date;
  events: CalendarEvent[];
}

function PlanContent({ plan, date, now, events }: PlanContentProps) {
  const home = useSettingsStore((s) => s.home);
  const school = useSettingsStore((s) => s.school);
  const schoolName = useSettingsStore((s) => s.schoolName);

  switch (plan.status) {
    case 'loading':
      return <TravelSkeleton />;
    case 'no_classes':
      return (
        <EmptyState
          icon={<CalendarOff />}
          title="Ingen timer denne dagen"
          description="Du har ingen timer å rekke. Velg en annen dag for å se reisen."
        />
      );
    case 'missing_address':
      return (
        <EmptyState
          icon={<MapPinOff />}
          title="Legg inn adressene dine"
          description="Vi trenger hjemmeadressen og adressen til skolen for å finne reisen."
          action={<ButtonLink to="/innstillinger">Gå til innstillinger</ButtonLink>}
        />
      );
    case 'error':
      return <PlanError plan={plan} />;
    case 'ready':
      break;
  }

  const nameOf = (place: Place) => {
    if (home && samePlace(place, home)) return 'Hjemme';
    if (school && samePlace(place, school)) return schoolName || place.label;
    return place.label;
  };
  const eventTitle = (trip: PlannedTrip) => events.find((e) => e.id === trip.eventId)?.title;
  const isToday = date === todayISO();
  const trips = tripsInOrder(plan);
  // The hero colour goes to the next trip that has not left yet (today), else the first.
  const primaryIndex = isToday
    ? trips.findIndex((trip) => trip.pattern && Date.parse(trip.pattern.startTime) > now.getTime() - 60_000)
    : 0;

  return (
    <>
      {trips.map((trip, index) => {
        const title = eventTitle(trip);
        const heading =
          trip.purpose === 'to_school'
            ? `Til ${nameOf(trip.to) === schoolName ? 'skolen' : (title ?? nameOf(trip.to))}`
            : trip.purpose === 'between'
              ? `Videre til ${title ?? nameOf(trip.to)}`
              : 'Hjem';
        return (
          <Section key={`${trip.purpose}-${trip.eventId ?? index}`} title={heading}>
            {trip.purpose === 'between' ? (
              <p className="-mt-2 text-small text-ink-2">
                {title ?? 'Timen'} er på {trip.to.label}.
              </p>
            ) : null}
            <TripPlanCard
              trip={trip}
              fromName={nameOf(trip.from)}
              toName={nameOf(trip.to)}
              eventTitle={title}
              now={isToday ? now : null}
              tone={index === primaryIndex ? 'primary' : 'default'}
            />
          </Section>
        );
      })}
    </>
  );
}

function PlanError({ plan }: { plan: DailyPlan }) {
  const error = plan.error;
  if (error?.code === 'NO_TRIPS') {
    return (
      <EmptyState
        icon={<SearchX />}
        title="Fant ingen reiser"
        description={error.message}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" icon={<RotateCw />} onClick={plan.refresh} loading={plan.refreshing}>
              Prøv igjen
            </Button>
            <ButtonLink to="/innstillinger" variant="ghost">
              Sjekk adressene
            </ButtonLink>
          </div>
        }
      />
    );
  }
  if (error?.code === 'OFFLINE') {
    return (
      <ErrorState
        icon={<WifiOff />}
        title="Ingen forbindelse"
        description={error.message}
        onRetry={plan.refresh}
      />
    );
  }
  return (
    <ErrorState
      title="Fikk ikke hentet reisen"
      description={error?.message ?? 'Noe gikk galt. Prøv igjen om litt.'}
      onRetry={plan.refresh}
    />
  );
}
