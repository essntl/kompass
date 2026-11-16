import { Link } from 'react-router';
import { Avatar, cn } from '@/components/ui';
import { formatTimestamp } from '@/lib/date';
import { useNow } from '@/lib/timetable';
import { useThreadSummaries, type ThreadSummary } from '@/stores/messages';
import { useSubjectMap } from '@/stores/timetable';
import { useMessagesUiStore } from '../store';

/** The conversations, the most recent first. `activeId` highlights the open one (desktop). */
export function ThreadList({ activeId, className }: { activeId?: string; className?: string }) {
  const summaries = useThreadSummaries();
  const typing = useMessagesUiStore((s) => s.typing);
  const subjects = useSubjectMap();
  const now = useNow(60_000);

  return (
    <ul aria-label="Samtaler" className={cn('flex flex-col', className)}>
      {summaries.map((summary) => (
        <li key={summary.thread.id} className="border-b border-line last:border-b-0">
          <ThreadRow
            summary={summary}
            active={summary.thread.id === activeId}
            typing={!!typing[summary.thread.id]}
            subjectNames={(summary.teacher?.subjectIds ?? [])
              .map((id) => subjects.get(id)?.name)
              .filter((name): name is string => !!name)}
            now={now}
          />
        </li>
      ))}
    </ul>
  );
}

function preview(summary: ThreadSummary): string {
  const last = summary.lastMessage;
  if (!last) return 'Ingen meldinger ennå';
  if (last.kind === 'absence') return 'Du: Fravær meldt';
  const text = last.text.replace(/\s+/g, ' ');
  return last.from === 'student' ? `Du: ${text}` : text;
}

function ThreadRow({
  summary,
  active,
  typing,
  subjectNames,
  now,
}: {
  summary: ThreadSummary;
  active: boolean;
  typing: boolean;
  subjectNames: string[];
  now: Date;
}) {
  const { thread, teacher, lastMessage, unreadCount } = summary;
  const name = teacher?.name ?? 'Lærer';
  const unread = unreadCount > 0;
  const role = [teacher?.role, subjectNames.join(', ')].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/meldinger/${thread.id}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-18 items-center gap-3 px-4 py-3 transition-[background-color] duration-150',
        active ? 'bg-primary-soft' : 'hover:bg-surface-hover active:bg-surface-hover',
      )}
    >
      {teacher ? <Avatar name={name} color={teacher.color} size="lg" /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-body text-ink',
              unread ? 'font-bold' : 'font-semibold',
            )}
          >
            {name}
          </span>
          {lastMessage ? (
            <time
              dateTime={lastMessage.sentAt}
              className={cn(
                'shrink-0 text-caption tabular-nums',
                unread ? 'font-semibold text-ink' : 'text-ink-2',
              )}
            >
              {formatTimestamp(lastMessage.sentAt, now)}
            </time>
          ) : null}
        </div>
        {role ? <p className="truncate text-caption text-ink-2">{role}</p> : null}
        <div className="mt-0.5 flex items-center gap-2">
          <p
            className={cn(
              'min-w-0 flex-1 truncate text-small',
              typing
                ? active
                  ? 'text-primary-soft-ink'
                  : 'text-primary'
                : unread
                  ? 'font-medium text-ink'
                  : 'text-ink-2',
            )}
          >
            {typing ? 'Skriver …' : preview(summary)}
          </p>
          {unread ? (
            <span className="relative grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-caption font-bold text-accent-ink tabular-nums">
              {unreadCount}
              <span className="sr-only">
                {unreadCount === 1 ? ' ulest melding' : ' uleste meldinger'}
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
