import { useMessagesStore } from '@/stores/messages';
import { useMessagesUiStore } from '../store';
import { replyDelayMs } from './replies';

/**
 * Simulated teacher replies. The timers live at module level, not in a component, so a
 * reply still arrives – as an unread message with a badge in the navigation – when the
 * student has left the thread or the Meldinger page altogether.
 */

/** The teacher starts "typing" a moment after the message is sent, not in the same instant. */
const TYPING_LEAD_MS = 600;

interface Pending {
  typing: ReturnType<typeof setTimeout>;
  reply: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, Pending>();

export function cancelTeacherReply(threadId: string): void {
  const timers = pending.get(threadId);
  if (!timers) return;
  clearTimeout(timers.typing);
  clearTimeout(timers.reply);
  pending.delete(threadId);
  useMessagesUiStore.getState().setTyping(threadId, false);
}

/** Stops every simulated reply in flight (tests, demo reset). */
export function cancelAllTeacherReplies(): void {
  for (const threadId of [...pending.keys()]) cancelTeacherReply(threadId);
}

/**
 * Shows the typing indicator and delivers `compose()` after `delayMs` (1.5–4 s by default).
 * A new call for the same thread replaces the one in flight: a teacher answers the latest
 * message once instead of queueing one reply per message.
 */
export function scheduleTeacherReply(
  threadId: string,
  compose: () => string,
  delayMs: number = replyDelayMs(),
): void {
  cancelTeacherReply(threadId);

  const typing = setTimeout(
    () => useMessagesUiStore.getState().setTyping(threadId, true),
    Math.min(TYPING_LEAD_MS, delayMs / 2),
  );
  const reply = setTimeout(() => {
    pending.delete(threadId);
    useMessagesUiStore.getState().setTyping(threadId, false);
    const store = useMessagesStore.getState();
    // The thread is gone after "Tilbakestill demodata" with other seed ids.
    if (!store.threads.some((thread) => thread.id === threadId)) return;
    store.receiveMessage(threadId, compose());
  }, delayMs);

  pending.set(threadId, { typing, reply });
}
