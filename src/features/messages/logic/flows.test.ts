import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbsenceDetectResponse } from '@shared/api';
import type { Message } from '@shared/types';
import { SEED_UNREAD_THREAD_ID, threadIdFor } from '@/data/seed/messages';
import { TEACHER_IDS } from '@/data/seed/teachers';
import { addDaysISO, todayISO } from '@/lib/date';
import { classesOn } from '@/lib/timetable';
import { useMessagesStore } from '@/stores/messages';
import { useTimetableStore } from '@/stores/timetable';
import { useMessagesUiStore } from '../store';
import { runAbsenceDetection, shouldDetect } from './detectionRunner';
import { acceptSuggestion, dismissSuggestion, sendChatMessage } from './flows';
import {
  cancelAllTeacherReplies,
  cancelTeacherReply,
  scheduleTeacherReply,
} from './replyScheduler';

const today = todayISO();
/** The first day from tomorrow on that has classes in the seed timetable. */
function nextSchoolDay(): string {
  for (let i = 1; i < 14; i += 1) {
    const date = addDaysISO(today, i);
    if (classesOn(useTimetableStore.getState().events, date).length > 0) return date;
  }
  throw new Error('no school day in the seed');
}

const wholeDay = (
  date: string,
  patch: Partial<AbsenceDetectResponse> = {},
): AbsenceDetectResponse => ({
  isAbsence: true,
  dates: [date],
  classes: [],
  classEventIds: [],
  wholeDay: true,
  reason: 'sykdom',
  reasonText: 'Syk',
  mock: true,
  ...patch,
});

const thread = threadIdFor(TEACHER_IDS.ingrid);

function studentMessage(text: string): Message {
  return useMessagesStore.getState().sendMessage(thread, text);
}

beforeEach(() => {
  cancelAllTeacherReplies();
  useTimetableStore.getState().reset();
  useMessagesStore.getState().reset();
  useMessagesUiStore.setState({ suggestions: {}, typing: {}, drafts: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('shouldDetect', () => {
  it('only checks ordinary student messages with some content', () => {
    const base: Message = {
      id: 'x',
      threadId: thread,
      from: 'student',
      text: 'Jeg er syk i dag',
      sentAt: '',
      read: true,
      kind: 'text',
    };
    expect(shouldDetect(base)).toBe(true);
    expect(shouldDetect({ ...base, kind: 'absence' })).toBe(false);
    expect(shouldDetect({ ...base, from: 'teacher' })).toBe(false);
    expect(shouldDetect({ ...base, text: 'Ok' })).toBe(false);
  });
});

describe('runAbsenceDetection', () => {
  it('sends the message with today and the upcoming classes, then stores a pending suggestion', async () => {
    const date = nextSchoolDay();
    const detect = vi.fn(async () => wholeDay(date));
    const message = studentMessage('Jeg er syk og kommer ikke');

    await expect(runAbsenceDetection(message, { detect, today })).resolves.toBe(true);

    const [request] = detect.mock.calls[0] as unknown as [
      { message: string; today: string; upcomingClasses: unknown[] },
    ];
    expect(request.message).toBe('Jeg er syk og kommer ikke');
    expect(request.today).toBe(today);
    expect(request.upcomingClasses.length).toBeGreaterThan(0);

    expect(useMessagesUiStore.getState().suggestions[message.id]).toMatchObject({
      threadId: thread,
      status: 'pending',
      mock: true,
      input: {
        dates: [date],
        wholeDay: true,
        reason: 'sykdom',
        source: 'ai',
      },
    });
  });

  it('is silent when the request fails or is aborted', async () => {
    const message = studentMessage('Jeg er syk i morgen');
    const failing = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(runAbsenceDetection(message, { detect: failing, today })).resolves.toBe(false);

    const aborting = vi.fn(async () => {
      throw new DOMException('Aborted', 'AbortError');
    });
    await expect(runAbsenceDetection(message, { detect: aborting, today })).resolves.toBe(false);
    expect(useMessagesUiStore.getState().suggestions).toEqual({});
  });

  it('does not suggest what is not an absence or already registered', async () => {
    const date = nextSchoolDay();
    const message = studentMessage('Jeg er syk i morgen');
    await runAbsenceDetection(message, {
      detect: async () => wholeDay(date, { isAbsence: false }),
      today,
    });

    acceptOnce(date);
    await runAbsenceDetection(message, {
      detect: async () => wholeDay(date),
      today,
    });
    expect(useMessagesUiStore.getState().suggestions).toEqual({});
  });

  it('skips absence notices without calling the backend', async () => {
    const detect = vi.fn(async () => wholeDay(nextSchoolDay()));
    const notice: Message = {
      ...studentMessage('Jeg er syk i morgen'),
      kind: 'absence',
    };
    await runAbsenceDetection(notice, { detect, today });
    expect(detect).not.toHaveBeenCalled();
  });
});

/** Registers a whole-day absence through the same path a confirmed card uses. */
function acceptOnce(date: string) {
  useMessagesUiStore.getState().addSuggestion({
    messageId: 'seed-suggestion',
    threadId: thread,
    input: {
      dates: [date],
      wholeDay: true,
      classEventIds: [],
      reason: 'sykdom',
      source: 'ai',
    },
    mock: false,
    status: 'pending',
  });
  acceptSuggestion('seed-suggestion');
  useMessagesUiStore.setState({ suggestions: {} });
}

describe('suggestion cards', () => {
  it('"Legg til" reports the absence with source ai and marks the card as added', () => {
    const date = nextSchoolDay();
    acceptOnceKeep(date);
    const suggestion = useMessagesUiStore.getState().suggestions.card;
    expect(suggestion?.status).toBe('added');
    const record = useMessagesStore.getState().absences.find((a) => a.id === suggestion?.absenceId);
    expect(record).toMatchObject({
      source: 'ai',
      dates: [date],
      wholeDay: true,
    });
    // A second tap does nothing.
    expect(acceptSuggestion('card')).toBeNull();
    expect(useMessagesStore.getState().absences).toHaveLength(1);
  });

  it('"Ikke nå" dismisses without reporting', () => {
    useMessagesUiStore.getState().addSuggestion({
      messageId: 'card',
      threadId: thread,
      input: {
        dates: [nextSchoolDay()],
        wholeDay: true,
        classEventIds: [],
        reason: 'sykdom',
        source: 'ai',
      },
      mock: false,
      status: 'pending',
    });
    dismissSuggestion('card');
    expect(useMessagesUiStore.getState().suggestions.card?.status).toBe('dismissed');
    expect(useMessagesStore.getState().absences).toHaveLength(0);
  });
});

function acceptOnceKeep(date: string) {
  useMessagesUiStore.getState().addSuggestion({
    messageId: 'card',
    threadId: thread,
    input: {
      dates: [date],
      wholeDay: true,
      classEventIds: [],
      reason: 'sykdom',
      source: 'ai',
    },
    mock: false,
    status: 'pending',
  });
  acceptSuggestion('card');
}

describe('simulated teacher replies', () => {
  it('types, then delivers an unread reply after the delay, even with nobody watching', () => {
    vi.useFakeTimers();
    scheduleTeacherReply(SEED_UNREAD_THREAD_ID, () => 'Takk for beskjed.', 2000);
    expect(useMessagesUiStore.getState().typing[SEED_UNREAD_THREAD_ID]).toBeUndefined();

    vi.advanceTimersByTime(700);
    expect(useMessagesUiStore.getState().typing[SEED_UNREAD_THREAD_ID]).toBe(true);

    vi.advanceTimersByTime(1300);
    expect(useMessagesUiStore.getState().typing[SEED_UNREAD_THREAD_ID]).toBeUndefined();
    const last = useMessagesStore.getState().messages.at(-1);
    expect(last).toMatchObject({
      threadId: SEED_UNREAD_THREAD_ID,
      from: 'teacher',
      read: false,
      text: 'Takk for beskjed.',
    });
  });

  it('answers a burst of messages once', () => {
    vi.useFakeTimers();
    const before = useMessagesStore.getState().messages.length;
    sendChatMessage(thread, 'Hei');
    sendChatMessage(thread, 'Har du tid i morgen?');
    vi.advanceTimersByTime(5000);
    const added = useMessagesStore.getState().messages.slice(before);
    expect(added.map((m) => m.from)).toEqual(['student', 'student', 'teacher']);
  });

  it('can be cancelled', () => {
    vi.useFakeTimers();
    const before = useMessagesStore.getState().messages.length;
    scheduleTeacherReply(thread, () => 'Hei', 1500);
    cancelTeacherReply(thread);
    vi.advanceTimersByTime(5000);
    expect(useMessagesStore.getState().messages).toHaveLength(before);
  });

  it('ignores empty messages', () => {
    expect(sendChatMessage(thread, '   ')).toBeNull();
  });
});
