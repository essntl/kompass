import { CalendarCheck, Sparkles, Trash } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { AbsenceRecord, CalendarEvent } from '@shared/types';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Sheet,
  cn,
  toast,
} from '@/components/ui';
import { todayISO } from '@/lib/date';
import { spring, tween } from '@/lib/motion';
import { removeAbsence } from '@/stores/actions';
import { useMessagesStore } from '@/stores/messages';
import { useTimetableStore } from '@/stores/timetable';
import { absenceRowText, groupAbsences } from '../logic/myAbsences';

export interface MyAbsencesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Meld fravær" from the empty state. */
  onReportAbsence: () => void;
}

/** "Mitt fravær": what the student has reported, upcoming first, each removable. */
export function MyAbsencesSheet({ open, onOpenChange, onReportAbsence }: MyAbsencesSheetProps) {
  const absences = useMessagesStore((s) => s.absences);
  const events = useTimetableStore((s) => s.events);
  const today = todayISO();
  const groups = useMemo(() => groupAbsences(absences, today), [absences, today]);
  const [removing, setRemoving] = useState<{
    record: AbsenceRecord;
    label: string;
  } | null>(null);

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="Mitt fravær"
        description="Fravær du har meldt i appen."
      >
        {absences.length === 0 ? (
          <EmptyState
            size="compact"
            icon={<CalendarCheck />}
            title="Ingen fravær meldt"
            description="Når du melder fravær, ser du det her."
            action={<Button onClick={onReportAbsence}>Meld fravær</Button>}
          />
        ) : (
          <div className="flex flex-col gap-6 pb-2">
            <AbsenceGroup
              title="Kommende"
              empty="Ingen kommende fravær."
              records={groups.upcoming}
              events={events}
              onRemove={(record, label) => setRemoving({ record, label })}
            />
            {groups.past.length > 0 ? (
              <AbsenceGroup
                title="Tidligere"
                records={groups.past}
                events={events}
                past
                onRemove={(record, label) => setRemoving({ record, label })}
              />
            ) : null}
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(next) => !next && setRemoving(null)}
        title="Fjerne fraværet?"
        description={
          removing
            ? `${removing.label}. Det forsvinner fra timeplanen, og fraværsmeldingen til lærerne blir slettet.`
            : undefined
        }
        confirmLabel="Fjern"
        onConfirm={() => {
          if (!removing) return;
          removeAbsence(removing.record.id);
          toast('Fraværet er fjernet');
        }}
      />
    </>
  );
}

function AbsenceGroup({
  title,
  empty,
  records,
  events,
  past = false,
  onRemove,
}: {
  title: string;
  empty?: string;
  records: AbsenceRecord[];
  events: CalendarEvent[];
  past?: boolean;
  onRemove: (record: AbsenceRecord, label: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-small font-semibold text-ink-2">{title}</h3>
      {records.length === 0 && empty ? <p className="text-small text-ink-2">{empty}</p> : null}
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {records.map((record) => {
            const row = absenceRowText(record, events);
            const label = `${row.when}, ${row.scope === 'Hele dagen' ? 'hele dagen' : row.scope}`;
            return (
              <motion.li
                key={record.id}
                layout
                exit={{ opacity: 0, transition: tween.fast }}
                transition={spring.layout}
                className={cn(
                  'flex items-start gap-3 rounded-lg py-3 pr-1 pl-4',
                  past ? 'bg-surface-2' : 'border border-line bg-surface',
                )}
              >
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="text-body font-semibold text-ink">{row.when}</p>
                  <p className="text-small text-ink-2">{row.scope}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={past ? 'neutral' : 'danger'}>{row.reason}</Badge>
                    {record.source === 'ai' ? (
                      <Badge tone="neutral" icon={<Sparkles />}>
                        Fra chat
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <IconButton
                  label={`Fjern fravær: ${label}`}
                  icon={<Trash />}
                  onClick={() => onRemove(record, label)}
                />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
