import { AnimatePresence, motion } from 'motion/react';
import { formatMonthYear } from '@/lib/date';
import { capitalise, groupByMonth } from '../logic';
import { layoutTransition, listItem, monthGroup, type ItemCustom } from '../motion';
import type { EntryListProps } from './EntryGrid';
import { EntryRow } from './EntryRow';

/**
 * Entries grouped by month, newest first, along a quiet vertical rule. Month headings
 * glide with the rows when filtering changes which months are shown.
 */
export function EntryTimeline({
  entries,
  subjects,
  entrance,
  selecting,
  selectedIds,
  selectionFull,
  onToggle,
}: EntryListProps) {
  const groups = groupByMonth(entries);
  let position = 0;

  return (
    <div className="relative flex flex-col gap-6">
      <AnimatePresence mode="popLayout" initial={entrance}>
        {groups.map((group) => {
          const headingId = `portefolje-maaned-${group.key}`;
          const headingCustom: ItemCustom = { index: position, entrance };
          return (
            <motion.section
              key={group.key}
              layout="position"
              custom={entrance}
              variants={monthGroup}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={layoutTransition}
              aria-labelledby={headingId}
              className="flex flex-col gap-3"
            >
              <motion.h2
                id={headingId}
                custom={headingCustom}
                variants={listItem}
                initial={entrance ? 'hidden' : false}
                animate="show"
                className="flex items-baseline gap-2 text-heading font-semibold text-ink"
              >
                {capitalise(formatMonthYear(`${group.key}-01`))}
                <span className="text-small font-normal text-ink-2 tabular-nums">
                  {group.entries.length === 1 ? '1 oppføring' : `${group.entries.length} oppføringer`}
                </span>
              </motion.h2>
              <ul className="relative flex flex-col gap-3 border-l-2 border-line pl-3 desktop:pl-4">
                <AnimatePresence mode="popLayout" initial={entrance}>
                  {group.entries.map((entry) => {
                    position += 1;
                    const selected = selectedIds.includes(entry.id);
                    const custom: ItemCustom = { index: position, entrance };
                    return (
                      <motion.li
                        key={entry.id}
                        layout
                        custom={custom}
                        variants={listItem}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        transition={layoutTransition}
                      >
                        <EntryRow
                          entry={entry}
                          subject={entry.subjectId ? subjects.get(entry.subjectId) : undefined}
                          selecting={selecting}
                          selected={selected}
                          blocked={selecting && selectionFull && !selected}
                          onToggle={onToggle}
                        />
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </motion.section>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
