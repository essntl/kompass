import { motion } from 'motion/react';
import { cn } from '@/components/ui';
import { formatTime } from '@/lib/date';
import { tween } from '@/lib/motion';
import type { MessageItem } from '../logic/chatItems';
import { AbsenceNoticeBubble } from './AbsenceNoticeBubble';
import { SuggestionCard } from './SuggestionCard';

/**
 * One message in the chat. Rows that exist when the thread opens are just there; rows
 * added while it is open rise and fade in (own bubbles slide in from the right, where
 * the composer is). The parent's `AnimatePresence initial={false}` makes that split.
 */
export function MessageRow({
  item,
  teacherId,
  teacherName,
  onSuggestionDismissed,
}: {
  item: MessageItem;
  teacherId: string | undefined;
  teacherName: string;
  onSuggestionDismissed: () => void;
}) {
  const { message, firstInGroup, lastInGroup } = item;
  const own = message.from === 'student';

  return (
    <motion.li
      initial={{ opacity: 0, y: 8, x: own ? 12 : 0 }}
      animate={{ opacity: 1, y: 0, x: 0, transition: tween.base }}
      exit={{ opacity: 0, transition: tween.fast }}
      className={cn(
        'flex flex-col',
        own ? 'items-end' : 'items-start',
        firstInGroup ? 'mt-3' : 'mt-1',
      )}
    >
      <span className="sr-only">{own ? 'Du:' : `${teacherName}:`}</span>
      {message.kind === 'absence' ? (
        <AbsenceNoticeBubble message={message} teacherId={teacherId} joinedAbove={!firstInGroup} />
      ) : (
        <div
          className={cn(
            'max-w-[85%] px-3.5 py-2 text-body whitespace-pre-wrap break-words desktop:max-w-[70%]',
            own
              ? cn(
                  'rounded-lg rounded-br-sm bg-primary text-primary-ink',
                  !firstInGroup && 'rounded-tr-sm',
                )
              : cn(
                  'rounded-lg rounded-bl-sm border border-line bg-surface text-ink',
                  !firstInGroup && 'rounded-tl-sm',
                ),
          )}
        >
          {message.text}
        </div>
      )}
      {lastInGroup ? (
        <time dateTime={message.sentAt} className="mt-1 px-1 text-caption text-ink-3">
          {formatTime(message.sentAt)}
        </time>
      ) : null}
      {own && message.kind === 'text' ? (
        <SuggestionCard messageId={message.id} onDismissed={onSuggestionDismissed} />
      ) : null}
    </motion.li>
  );
}
