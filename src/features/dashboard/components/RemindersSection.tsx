import type { Reminder, ReminderKind } from '@shared/types';
import { CalendarDays, ChevronRight, CircleCheck, Clock, Hourglass, MessageCircle, UserX } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Badge, Card, cn, EmptyState, Section } from '@/components/ui';
import { staggerDelay, tween } from '@/lib/motion';
import { isUrgent, reminderWhen } from '../logic/reminders';

const KIND: Record<ReminderKind, { icon: ReactNode; tile: string; label: string }> = {
  message: { icon: <MessageCircle />, tile: 'bg-primary-soft text-primary-soft-ink', label: 'Melding' },
  deadline: { icon: <Hourglass />, tile: 'bg-accent-soft text-accent-soft-ink', label: 'Frist' },
  event: { icon: <CalendarDays />, tile: 'bg-info-soft text-info-soft-ink', label: 'Avtale' },
  absence: { icon: <UserX />, tile: 'bg-danger-soft text-danger-soft-ink', label: 'Fravær' },
};

/*
 * The section rises with the page wave; its rows follow as a shorter, quieter wave
 * (fade + 4px) so the list reads as one gesture instead of a second entrance.
 */
const listVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: (index: number) => 0.06 + staggerDelay(index) } },
};
const rowVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: tween.base },
};

export interface RemindersSectionProps {
  reminders: Reminder[];
  now: Date;
}

export function RemindersSection({ reminders, now }: RemindersSectionProps) {
  return (
    <Section title="Påminnelser">
      {reminders.length === 0 ? (
        <Card>
          <EmptyState
            size="compact"
            icon={<CircleCheck />}
            title="Alt er i rute"
            description="Ingen nye meldinger, frister eller avtaler å følge med på akkurat nå."
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <motion.ul variants={listVariants} className="divide-y divide-line">
            {reminders.map((reminder) => (
              <motion.li key={reminder.id} variants={rowVariants}>
                <ReminderRow reminder={reminder} now={now} />
              </motion.li>
            ))}
          </motion.ul>
        </Card>
      )}
    </Section>
  );
}

function ReminderRow({ reminder, now }: { reminder: Reminder; now: Date }) {
  const kind = KIND[reminder.kind];
  const when = reminderWhen(reminder, now);
  const urgent = isUrgent(reminder, now);

  return (
    <Link
      to={reminder.href}
      className={cn(
        'relative flex min-h-16 items-center gap-3 px-4 py-3 text-left',
        'transition-[background-color] duration-150 ease-out hover:bg-surface-hover active:bg-surface-2',
        'focus-visible:-outline-offset-2',
      )}
    >
      <span
        aria-hidden
        className={cn('grid size-10 shrink-0 place-items-center rounded-md [&_svg]:size-5', kind.tile)}
      >
        {kind.icon}
      </span>
      {/* The time sits under the title, not beside it, so the title gets the row's width
          and wraps to two lines instead of being cut off in the narrow desktop column. */}
      <span className="min-w-0 flex-1">
        <span className="sr-only">{kind.label}: </span>
        <span className="line-clamp-2 font-semibold text-ink">{reminder.title}</span>
        {reminder.detail ? (
          <span className="block truncate text-small text-ink-2">{reminder.detail}</span>
        ) : null}
        {when ? (
          urgent ? (
            <Badge tone="accent" icon={<Clock />} className="mt-1.5">
              <span className="sr-only">Snart: </span>
              {when}
            </Badge>
          ) : (
            <span className="mt-0.5 block text-small text-ink-2 nums">{when}</span>
          )
        ) : null}
      </span>
      <ChevronRight aria-hidden className="-mr-1 size-5 shrink-0 text-ink-3" />
    </Link>
  );
}
