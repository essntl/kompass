import type { AbsenceDetectRequest, AbsenceDetectResponse } from '@shared/api';
import type { Message } from '@shared/types';
import { detectAbsence } from '@/lib/api';
import { todayISO } from '@/lib/date';
import { useMessagesStore } from '@/stores/messages';
import { useTimetableStore } from '@/stores/timetable';
import { useMessagesUiStore } from '../store';
import {
  MAX_DETECTION_MESSAGE_LENGTH,
  buildUpcomingClasses,
  detectionToAbsenceInput,
  isAbsenceRegistered,
} from './detection';

/**
 * Background absence detection for an ordinary chat message. Lives outside React so a
 * slow answer still lands (as a pending suggestion card) after the student has left the
 * thread. Every failure is silent: this is a helpful extra, never a blocker.
 */

/** A background check that has not answered by then is not worth waiting for. */
export const DETECTION_TIMEOUT_MS = 15_000;
/** "Ok", "Hei", "Takk" cannot describe an absence; skip the round trip. */
const MIN_LENGTH = 6;

type Detect = (
  request: AbsenceDetectRequest,
  options: { signal?: AbortSignal },
) => Promise<AbsenceDetectResponse>;

export interface DetectionDeps {
  detect?: Detect;
  today?: string;
  timeoutMs?: number;
}

/** Messages worth sending to the backend. */
export function shouldDetect(message: Message): boolean {
  return (
    message.from === 'student' &&
    message.kind === 'text' &&
    message.text.trim().length >= MIN_LENGTH
  );
}

/**
 * Runs detection for `message` and stores a pending suggestion when the backend finds a
 * new absence. Resolves to true when a suggestion was added.
 */
export async function runAbsenceDetection(
  message: Message,
  {
    detect = detectAbsence,
    today = todayISO(),
    timeoutMs = DETECTION_TIMEOUT_MS,
  }: DetectionDeps = {},
): Promise<boolean> {
  if (!shouldDetect(message)) return false;

  const request: AbsenceDetectRequest = {
    message: message.text.trim().slice(0, MAX_DETECTION_MESSAGE_LENGTH),
    today,
    upcomingClasses: buildUpcomingClasses(useTimetableStore.getState().events, today),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: AbsenceDetectResponse;
  try {
    response = await detect(request, { signal: controller.signal });
  } catch {
    // ApiError, offline, timeout (AbortError): the student never asked for this check.
    return false;
  } finally {
    clearTimeout(timer);
  }

  // Read the stores again: the timetable may have changed while we waited.
  const events = useTimetableStore.getState().events;
  const input = detectionToAbsenceInput(response, events, today);
  if (!input || isAbsenceRegistered(input, events)) return false;
  // The message is gone (demo data reset) – nothing to attach the card to.
  if (!useMessagesStore.getState().messages.some((m) => m.id === message.id)) return false;

  useMessagesUiStore.getState().addSuggestion({
    messageId: message.id,
    threadId: message.threadId,
    input,
    mock: response.mock,
    status: 'pending',
  });
  return true;
}
