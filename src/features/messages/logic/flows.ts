import type { AbsenceRecord, Message } from '@shared/types';
import type { AbsenceInput } from '@/lib/absence';
import { reportAbsence } from '@/stores/actions';
import { useMessagesStore } from '@/stores/messages';
import { useSettingsStore } from '@/stores/settings';
import { useMessagesUiStore } from '../store';
import { runAbsenceDetection } from './detectionRunner';
import { pickAbsenceAcknowledgement, pickReply } from './replies';
import { scheduleTeacherReply } from './replyScheduler';

/**
 * What the Meldinger UI does when the student acts. Components call these and stay thin;
 * the timers and background requests they start live outside React.
 */

const studentName = () => useSettingsStore.getState().profile.name;

/** Sends an ordinary chat message, starts the teacher's reply and the absence check. */
export function sendChatMessage(threadId: string, text: string): Message | null {
  const clean = text.trim();
  if (!clean) return null;
  const message = useMessagesStore.getState().sendMessage(threadId, clean);
  useMessagesUiStore.getState().setDraft(threadId, '');
  scheduleTeacherReply(threadId, () => pickReply(clean, { studentName: studentName() }));
  void runAbsenceDetection(message);
  return message;
}

/**
 * Reports an absence and lets every notified teacher acknowledge it a moment later.
 * `skipThreadId`: a thread whose teacher already answers the message that led here.
 */
export function submitAbsence(input: AbsenceInput, skipThreadId?: string): AbsenceRecord {
  const record = reportAbsence(input);
  const { threads } = useMessagesStore.getState();
  for (const teacherId of record.teacherIds) {
    const thread = threads.find((t) => t.teacherId === teacherId);
    if (!thread || thread.id === skipThreadId) continue;
    scheduleTeacherReply(thread.id, () =>
      pickAbsenceAcknowledgement(record.reason, { studentName: studentName() }),
    );
  }
  return record;
}

/** "Legg til" on a suggestion card. */
export function acceptSuggestion(messageId: string): AbsenceRecord | null {
  const ui = useMessagesUiStore.getState();
  const suggestion = ui.suggestions[messageId];
  if (!suggestion || suggestion.status !== 'pending') return null;
  const record = submitAbsence({ ...suggestion.input, source: 'ai' }, suggestion.threadId);
  ui.updateSuggestion(messageId, { status: 'added', absenceId: record.id });
  return record;
}

/** "Ikke nå" on a suggestion card. */
export function dismissSuggestion(messageId: string): void {
  useMessagesUiStore.getState().updateSuggestion(messageId, { status: 'dismissed' });
}
