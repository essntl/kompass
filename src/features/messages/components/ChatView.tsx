import { ArrowLeft, CalendarX } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar, IconButton, cn } from '@/components/ui';
import { useNow } from '@/lib/timetable';
import { useMessagesStore, useTeacher, useThread, useThreadMessages } from '@/stores/messages';
import { useSubjectMap } from '@/stores/timetable';
import { buildChatItems } from '../logic/chatItems';
import { useIsTeacherTyping } from '../store';
import { Composer } from './Composer';
import { MessageRow } from './MessageRow';
import { TypingIndicator } from './TypingIndicator';

/** Within this distance of the bottom the chat counts as "at the newest message". */
const STICK_THRESHOLD_PX = 96;

export interface ChatViewProps {
  threadId: string;
  /** `page`: the whole mobile screen, with back button and the page's h1. `pane`: desktop. */
  variant: 'page' | 'pane';
  onReportAbsence: () => void;
}

export function ChatView({ threadId, variant, onReportAbsence }: ChatViewProps) {
  const navigate = useNavigate();
  const thread = useThread(threadId);
  const teacher = useTeacher(thread?.teacherId);
  const messages = useThreadMessages(threadId);
  const typing = useIsTeacherTyping(threadId);
  const markThreadRead = useMessagesStore((s) => s.markThreadRead);
  const subjects = useSubjectMap();
  // Day separators ("I dag", "I går") move on at midnight.
  const now = useNow(60_000);
  const items = useMemo(() => buildChatItems(messages, now), [messages, now]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLOListElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);

  const teacherName = teacher?.name ?? 'Læreren';
  const subjectNames = (teacher?.subjectIds ?? [])
    .map((id) => subjects.get(id)?.name)
    .filter((name): name is string => !!name);
  const subtitle = [teacher?.role, ...subjectNames].filter(Boolean).join(' · ');

  // Reading the thread marks it read, also for replies that arrive while it is open.
  const unread = messages.filter((m) => m.from === 'teacher' && !m.read).length;
  useEffect(() => {
    if (unread > 0) markThreadRead(threadId);
  }, [threadId, unread, markThreadRead]);

  // The mobile thread is a page of its own: name it in the tab title.
  useEffect(() => {
    if (variant !== 'page') return;
    document.title = `${teacherName} – Kompass`;
    return () => {
      document.title = 'Kompass';
    };
  }, [variant, teacherName]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Open at the newest message, before the first paint.
  useLayoutEffect(() => {
    stick.current = true;
    scrollToBottom();
  }, [threadId, scrollToBottom]);

  // Whenever the content or the visible area changes size (a new bubble, the typing
  // dots, a suggestion card growing, the keyboard), stay pinned to the bottom if the
  // student was there. Following the size frame by frame avoids any jump.
  useEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    const observer = new ResizeObserver(() => {
      if (stick.current) scrollToBottom();
    });
    observer.observe(content);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
  }

  // Screen readers hear replies that arrive while the thread is open, not the history.
  const lastTeacher = [...messages].reverse().find((m) => m.from === 'teacher');
  const seenTeacherId = useRef(lastTeacher?.id);
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    if (!lastTeacher || lastTeacher.id === seenTeacherId.current) return;
    seenTeacherId.current = lastTeacher.id;
    setAnnouncement(`Ny melding fra ${teacherName}: ${lastTeacher.text}`);
  }, [lastTeacher, teacherName]);

  const Heading = variant === 'page' ? 'h1' : 'h2';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header
        className={cn(
          'flex shrink-0 items-center gap-3',
          variant === 'page' ? '-mt-1' : 'border-b border-line px-4 py-3',
        )}
      >
        {variant === 'page' ? (
          <IconButton
            label="Tilbake til meldinger"
            icon={<ArrowLeft />}
            onClick={() => navigate('/meldinger')}
            className="-ml-2.5"
          />
        ) : null}
        {teacher ? <Avatar name={teacher.name} color={teacher.color} /> : null}
        <div className="min-w-0 flex-1">
          <Heading className="truncate text-heading font-semibold text-ink">{teacherName}</Heading>
          {subtitle ? <p className="truncate text-small text-ink-2">{subtitle}</p> : null}
        </div>
        <IconButton label="Meld fravær" icon={<CalendarX />} onClick={onReportAbsence} />
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        tabIndex={0}
        aria-label={`Samtale med ${teacherName}`}
        // `relative`: the containing block for anything absolutely positioned inside the
        // chat (sr-only labels), so nothing escapes the scroller and scrolls the page.
        className={cn(
          'scroll-area relative min-h-0 flex-1 outline-offset-[-2px]',
          variant === 'page' ? '-mx-(--gutter) px-(--gutter)' : 'px-4',
        )}
      >
        <ol ref={contentRef} className="flex flex-col pt-1 pb-4">
          <AnimatePresence initial={false}>
            {items.map((item) =>
              item.type === 'day' ? (
                <li key={item.key} className="mt-5 mb-1 flex justify-center first:mt-2">
                  <span className="rounded-full bg-surface-2 px-3 py-0.5 text-caption font-medium text-ink-2">
                    {item.label}
                  </span>
                </li>
              ) : (
                <MessageRow
                  key={item.key}
                  item={item}
                  teacherId={teacher?.id}
                  teacherName={teacherName}
                  onSuggestionDismissed={() => scrollRef.current?.focus({ preventScroll: true })}
                />
              ),
            )}
          </AnimatePresence>
          <AnimatePresence>
            {typing ? <TypingIndicator key="typing" teacherName={teacherName} /> : null}
          </AnimatePresence>
        </ol>
        {items.length === 0 && !typing ? (
          <p className="py-10 text-center text-body text-ink-2">
            Ingen meldinger ennå. Skriv til {teacherName} her.
          </p>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className={cn(variant === 'pane' && 'border-t border-line px-4 py-3')}>
        <Composer
          ref={composerRef}
          threadId={threadId}
          teacherName={teacherName}
          onSent={() => {
            stick.current = true;
            scrollToBottom();
          }}
        />
      </div>
    </div>
  );
}
