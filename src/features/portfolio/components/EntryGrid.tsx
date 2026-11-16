import type { PortfolioEntry, Subject } from '@shared/types';
import { AnimatePresence, motion } from 'motion/react';
import { layoutTransition, listItem, type ItemCustom } from '../motion';
import { EntryCard } from './EntryCard';

export interface EntryListProps {
  entries: PortfolioEntry[];
  subjects: Map<string, Subject>;
  /** Stagger the items in (first render of the page only). */
  entrance: boolean;
  selecting: boolean;
  selectedIds: string[];
  selectionFull: boolean;
  onToggle: (id: string) => void;
}

/** Two columns on a phone, three on desktop. */
export function EntryGrid({
  entries,
  subjects,
  entrance,
  selecting,
  selectedIds,
  selectionFull,
  onToggle,
}: EntryListProps) {
  return (
    <ul className="relative grid grid-cols-2 gap-3 desktop:grid-cols-3 desktop:gap-4">
      <AnimatePresence mode="popLayout" initial={entrance}>
        {entries.map((entry, index) => {
          const selected = selectedIds.includes(entry.id);
          const custom: ItemCustom = { index, entrance };
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
              className="min-w-0"
            >
              <EntryCard
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
  );
}
