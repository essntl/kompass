import type { PlannedTrip, TripPattern } from '@shared/types';
import { SearchX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, EmptyState } from '@/components/ui';
import { formatDuration } from '@/lib/date';
import { fade } from '@/lib/motion';
import { ARRIVAL_WINDOW } from '@/stores/settings';
import { formatMinutesEarly, tripMinutes } from '../lib/format';
import { selectArrivalTrip, sortByDeparture } from '../lib/tripSelection';
import { AlternativeList } from './AlternativeList';
import { TripHero } from './TripHero';
import { TripTimeline } from './TripTimeline';

export interface TripPlanCardProps {
  trip: PlannedTrip;
  fromName: string;
  toName: string;
  eventTitle?: string;
  /** Set when the planned day is today (countdown, "har gått"). */
  now: Date | null;
  tone?: 'primary' | 'default';
}

interface Fit {
  fit: PlannedTrip['fit'];
  minutesEarly?: number;
  warning?: string;
}

/** Hero + leg timeline + "Andre avganger" for one planned trip. */
export function TripPlanCard({ trip, fromName, toName, eventTitle, now, tone = 'default' }: TripPlanCardProps) {
  const recommended = trip.pattern;
  const options = useMemo(
    () => sortByDeparture(recommended ? [recommended, ...trip.alternatives] : trip.alternatives),
    [recommended, trip.alternatives],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = options.find((p) => p.id === selectedId) ?? recommended;

  // The first time the trip shows, its legs enter one after another; switching to
  // another departure afterwards is a plain cross-fade.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  const fitOf = (pattern: TripPattern): Fit => {
    if (pattern.id === recommended?.id) {
      return { fit: trip.fit, minutesEarly: trip.minutesEarly, warning: trip.warning };
    }
    if (trip.purpose === 'home') return { fit: 'in_window' };
    const { fit, minutesEarly, warning } = selectArrivalTrip([pattern], trip.targetTime, ARRIVAL_WINDOW);
    return { fit, minutesEarly, warning };
  };

  if (!selected) {
    return (
      <Card>
        <EmptyState
          size="compact"
          icon={<SearchX />}
          title="Fant ingen reise"
          description={trip.warning ?? 'Vi fant ingen kollektivreise for denne strekningen.'}
        />
      </Card>
    );
  }

  const current = fitOf(selected);

  return (
    <div className="flex flex-col gap-3">
      <TripHero
        purpose={trip.purpose}
        pattern={selected}
        fit={current.fit}
        minutesEarly={current.minutesEarly}
        warning={current.warning}
        eventTitle={eventTitle}
        now={now}
        tone={tone}
      />
      <Card padding="none">
        <div className="relative px-3 pt-4 pb-2">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={selected.id}
              variants={fade}
              initial={mounted.current ? 'hidden' : false}
              animate="show"
              exit="exit"
            >
              <TripTimeline
                pattern={selected}
                fromName={fromName}
                toName={toName}
                entrance={!mounted.current}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <AlternativeList
          options={options}
          selectedId={selected.id}
          recommendedId={recommended?.id ?? null}
          onSelect={(pattern) => setSelectedId(pattern.id)}
          detail={(pattern) => {
            if (trip.purpose === 'home') return { text: formatDuration(tripMinutes(pattern)) };
            const info = fitOf(pattern);
            return {
              text: info.minutesEarly === undefined ? '' : formatMinutesEarly(info.minutesEarly),
              warn: info.fit !== 'in_window',
            };
          }}
        />
      </Card>
    </div>
  );
}
