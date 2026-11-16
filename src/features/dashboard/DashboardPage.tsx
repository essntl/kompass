import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Page, useIsDesktop } from '@/components/ui';
import { staggerContainer } from '@/lib/motion';
import { useNow } from '@/lib/timetable';
import { useTimetableStore } from '@/stores/timetable';
import { Greeting } from './components/Greeting';
import { LeaveCard } from './components/LeaveCard';
import { NextClassCard } from './components/NextClassCard';
import { QuickLinks } from './components/QuickLinks';
import { RemindersSection } from './components/RemindersSection';
import { Reveal } from './components/Reveal';
import { TodayClasses } from './components/TodayClasses';
import { dayOverview, nextClassState, travelDayFor } from './logic/schedule';
import { useReminders } from './useReminders';

/** The entrance wave plays once per visit to the app, not every time "Hjem" is tapped. */
let entrancePlayed = false;

/** Ticks often enough for "om 12 min" to stay right without re-rendering every second. */
const CLOCK_MS = 15_000;

/**
 * Hjem – "what is happening next, and when do I need to leave?"
 *
 * Mobile: one column in reading order. Desktop: the day on the left (next class, leave
 * time, today's classes), the things to keep an eye on to the right (reminders, links).
 * Rendered as two separate trees rather than CSS reordering, so the focus order always
 * matches what the student sees.
 */
export function DashboardPage() {
  const now = useNow(CLOCK_MS);
  const isDesktop = useIsDesktop();
  const timetable = useTimetableStore((s) => s.events);
  const reminders = useReminders(now);

  const [animateIn] = useState(() => !entrancePlayed);
  useEffect(() => {
    entrancePlayed = true;
  }, []);

  // Recompute the schedule once a minute; the clock itself ticks faster for the countdown.
  const minute = Math.floor(now.getTime() / 60_000);
  const schedule = useMemo(() => {
    const at = new Date(minute * 60_000);
    return {
      next: nextClassState(timetable, at),
      travelDay: travelDayFor(timetable, at),
      overview: dayOverview(timetable, at),
      timetableEmpty: !timetable.some((e) => e.kind === 'class'),
    };
  }, [timetable, minute]);

  const nextClass = (
    <Reveal>
      <NextClassCard state={schedule.next} now={now} timetableEmpty={schedule.timetableEmpty} />
    </Reveal>
  );
  // Keyed by date so a new day starts a fresh plan instead of showing yesterday's trip.
  const leave = (
    <Reveal>
      <LeaveCard key={schedule.travelDay.date} day={schedule.travelDay} now={now} />
    </Reveal>
  );
  const today = (
    <Reveal>
      <TodayClasses overview={schedule.overview} now={now} />
    </Reveal>
  );
  const reminderList = (
    <Reveal>
      <RemindersSection reminders={reminders} now={now} />
    </Reveal>
  );
  const links = (
    <Reveal>
      <QuickLinks />
    </Reveal>
  );

  return (
    <Page width="wide">
      <motion.div
        variants={staggerContainer}
        initial={animateIn ? 'hidden' : false}
        animate="show"
        className="flex flex-col gap-6"
      >
        <Reveal>
          <Greeting now={now} />
        </Reveal>

        {isDesktop ? (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,360px)] items-start gap-6">
            <div className="flex min-w-0 flex-col gap-4">
              {nextClass}
              {leave}
              <div className="mt-2">{today}</div>
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              {reminderList}
              {links}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <div className="flex min-w-0 flex-col gap-3">
              {nextClass}
              {leave}
            </div>
            {reminderList}
            {today}
            {links}
          </div>
        )}
      </motion.div>
    </Page>
  );
}
