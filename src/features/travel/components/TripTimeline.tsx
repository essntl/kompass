import type { TripPattern } from '@shared/types';
import { Clock, Footprints, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { formatDistance, formatStops } from '../lib/format';
import { modeColor, modeTitle } from '../lib/modes';
import { buildTimeline, type Rail, type TimelineItem } from '../lib/timeline';
import { LegTime } from './LegTime';
import { LineBadge } from './LineBadge';
import { SituationList } from './SituationList';

export interface TripTimelineProps {
  pattern: TripPattern;
  fromName: string;
  toName: string;
  /** Stagger the rows in (first time the trip appears). Later swaps just cross-fade. */
  entrance?: boolean;
}

const ROW = 'grid grid-cols-[3.5rem_1.5rem_minmax(0,1fr)] gap-x-2';

/** Walk → bus/tram/metro/train → transfer → walk, as a vertical route line. */
export function TripTimeline({ pattern, fromName, toName, entrance = false }: TripTimelineProps) {
  const items = buildTimeline(pattern, { from: fromName, to: toName });
  return (
    <motion.ol
      aria-label="Reiserute"
      variants={staggerContainer}
      initial={entrance ? 'hidden' : false}
      animate="show"
      className="flex flex-col"
    >
      {items.map((item) => (
        <motion.li key={item.key} variants={staggerItem} className={ROW}>
          <TimelineRow item={item} />
        </motion.li>
      ))}
    </motion.ol>
  );
}

function RailLine({ rail, className }: { rail: Rail; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute left-1/2 -translate-x-1/2',
        rail.kind === 'solid'
          ? cn('w-1 rounded-full', modeColor(rail.mode).bg)
          : 'w-0 border-l-2 border-dotted border-line-strong',
        className,
      )}
    />
  );
}

function platformLabel(item: Extract<TimelineItem, { type: 'node' }>): string | null {
  if (!item.platform) return null;
  const rail = item.below?.kind === 'solid' ? item.below : item.above?.kind === 'solid' ? item.above : null;
  return `${rail?.mode === 'rail' ? 'Spor' : 'Plattform'} ${item.platform}`;
}

function TimelineRow({ item }: { item: TimelineItem }) {
  if (item.type === 'node') {
    const solid = item.below?.kind === 'solid' ? item.below : item.above?.kind === 'solid' ? item.above : null;
    const platform = platformLabel(item);
    return (
      <>
        <span className="flex justify-end pt-1">
          <LegTime aimed={item.time.aimed} expected={item.time.expected} strong={item.end !== null} />
        </span>
        <span aria-hidden className="relative flex justify-center">
          {item.above ? <RailLine rail={item.above} className="top-0 h-3" /> : null}
          {item.below ? <RailLine rail={item.below} className="top-3 bottom-0" /> : null}
          <span
            className={cn(
              'relative mt-1.5 size-3 rounded-full border-2',
              item.end
                ? 'border-ink bg-ink'
                : cn('bg-surface', solid ? modeColor(solid.mode).border : 'border-line-strong'),
            )}
          />
        </span>
        <span className="min-w-0 pt-1 pb-2">
          <span className={cn('block text-body text-ink', item.end ? 'font-semibold' : 'font-medium')}>
            {item.name}
          </span>
          {platform ? <span className="block text-small text-ink-2">{platform}</span> : null}
        </span>
      </>
    );
  }

  if (item.type === 'transit') {
    const { leg } = item;
    const minutes = Math.max(1, Math.round(leg.duration / 60));
    return (
      <>
        <span />
        <span aria-hidden className="relative">
          <RailLine rail={item.rail} className="inset-y-0" />
        </span>
        <div className="min-w-0 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <LineBadge leg={leg} />
            {leg.headsign ? (
              <span className="min-w-0 truncate text-body font-medium text-ink">{leg.headsign}</span>
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-small text-ink-2">
            <span>{modeTitle(leg.mode)}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{formatStops(leg.intermediateStops ?? 0)}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{minutes} min</span>
            {leg.realtime ? (
              <span className="inline-flex items-center gap-1 font-semibold text-success">
                <Radio aria-hidden className="size-3.5" />
                Sanntid
              </span>
            ) : null}
          </p>
          <SituationList situations={leg.situations} />
        </div>
      </>
    );
  }

  if (item.type === 'walk') {
    const minutes = Math.max(1, Math.round(item.leg.duration / 60));
    return (
      <>
        <span />
        <span aria-hidden className="relative">
          <RailLine rail={item.rail} className="inset-y-0" />
        </span>
        <p className="flex min-h-11 items-center gap-2 py-2 text-small text-ink-2">
          <Footprints aria-hidden className="size-4 shrink-0 text-mode-foot" />
          <span className="tabular-nums">
            Gå {formatDistance(item.leg.distance)} · ca. {minutes} min
          </span>
        </p>
      </>
    );
  }

  return (
    <>
      <span />
      <span aria-hidden className="relative">
        <RailLine rail={item.rail} className="inset-y-0" />
      </span>
      <p className="flex min-h-10 items-center gap-2 py-1.5 text-small text-ink-2">
        <Clock aria-hidden className="size-4 shrink-0" />
        <span className="tabular-nums">
          {item.transfer ? 'Bytt, vent' : 'Vent'} {item.minutes} min
        </span>
      </p>
    </>
  );
}
