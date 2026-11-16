import { CalendarX } from 'lucide-react';
import type { Message } from '@shared/types';
import { cn } from '@/components/ui';
import { useAbsence, useMessagesStore } from '@/stores/messages';
import { useTimetableStore } from '@/stores/timetable';
import { noticeDetails } from '../logic/myAbsences';

/**
 * A structured absence notice ("Meld fravær" or a confirmed suggestion), sent by the
 * student. Falls back to the plain notice text when the record is missing.
 */
export function AbsenceNoticeBubble({
  message,
  teacherId,
  joinedAbove,
}: {
  message: Message;
  teacherId: string | undefined;
  joinedAbove: boolean;
}) {
  const record = useAbsence(message.absenceId);
  const events = useTimetableStore((s) => s.events);
  const teachers = useMessagesStore((s) => s.teachers);

  const corners = cn('rounded-lg rounded-br-sm', joinedAbove && 'rounded-tr-sm');

  if (!record) {
    return (
      <div
        className={cn(
          'max-w-[85%] bg-primary px-3.5 py-2 text-primary-ink whitespace-pre-wrap break-words',
          corners,
        )}
      >
        {message.text}
      </div>
    );
  }

  const details = noticeDetails(record, events, teacherId, teachers);

  return (
    <div
      className={cn(
        'w-full max-w-[85%] overflow-hidden border border-line bg-surface desktop:max-w-sm',
        corners,
      )}
    >
      <div className="flex items-center gap-2 border-b border-line bg-danger-soft px-3.5 py-2 text-danger-soft-ink">
        <CalendarX aria-hidden className="size-4 shrink-0" />
        <span className="text-small font-semibold">Fravær meldt</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 px-3.5 py-3 text-small">
        <dt className="text-ink-2">Når</dt>
        <dd className="text-ink">{details.when}</dd>
        <dt className="text-ink-2">Gjelder</dt>
        <dd className="text-ink">
          {details.classes.length === 0 ? (
            'Hele dagen'
          ) : (
            <ul>
              {details.classes.map((line) => (
                <li key={line} className="tabular-nums">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </dd>
        <dt className="text-ink-2">Årsak</dt>
        <dd className="text-ink">{details.reason}</dd>
      </dl>
      {details.note ? (
        <p className="border-t border-line px-3.5 py-2.5 text-small text-ink whitespace-pre-wrap break-words">
          {details.note}
        </p>
      ) : null}
    </div>
  );
}
