import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AbsenceRecord, Message, Teacher, Thread } from '@shared/types';
import { buildSeedMessages } from '@/data/seed/messages';
import { SEED_TEACHERS } from '@/data/seed/teachers';
import { newId } from '@/lib/id';
import { safeJSONStorage } from './persist';

export interface MessagesState {
  teachers: Teacher[];
  threads: Thread[];
  messages: Message[];
  /** Written by `reportAbsence` / `removeAbsence` in `@/stores/actions`. */
  absences: AbsenceRecord[];

  /** From the student. */
  sendMessage: (threadId: string, text: string) => Message;
  /** From the teacher, unread. */
  receiveMessage: (threadId: string, text: string) => Message;
  markThreadRead: (threadId: string) => void;
  /** The teacher's thread, created on first use. */
  ensureThread: (teacherId: string) => Thread;
  /** Back to the seed conversations (used by "Tilbakestill demodata"). */
  reset: () => void;
}

function seedState(now: Date = new Date()) {
  return {
    teachers: SEED_TEACHERS,
    ...buildSeedMessages(now),
    absences: [] as AbsenceRecord[],
  };
}

export const useMessagesStore = create<MessagesState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      sendMessage: (threadId, text) => {
        const message: Message = {
          id: newId(),
          threadId,
          from: 'student',
          text: text.trim(),
          sentAt: new Date().toISOString(),
          read: true,
          kind: 'text',
        };
        set((s) => ({ messages: [...s.messages, message] }));
        return message;
      },
      receiveMessage: (threadId, text) => {
        const message: Message = {
          id: newId(),
          threadId,
          from: 'teacher',
          text: text.trim(),
          sentAt: new Date().toISOString(),
          read: false,
          kind: 'text',
        };
        set((s) => ({ messages: [...s.messages, message] }));
        return message;
      },
      markThreadRead: (threadId) => {
        const hasUnread = get().messages.some((m) => m.threadId === threadId && isUnread(m));
        if (!hasUnread) return;
        set((s) => ({
          messages: s.messages.map((m) =>
            m.threadId === threadId && isUnread(m) ? { ...m, read: true } : m,
          ),
        }));
      },
      ensureThread: (teacherId) => {
        const existing = get().threads.find((t) => t.teacherId === teacherId);
        if (existing) return existing;
        const thread: Thread = { id: newId('th'), teacherId };
        set((s) => ({ threads: [...s.threads, thread] }));
        return thread;
      },
      reset: () => set(seedState()),
    }),
    { name: 'kompass:messages', version: 1, storage: safeJSONStorage<MessagesState>() },
  ),
);

// ---------------------------------------------------------------- pure selectors

export const isUnread = (message: Message) => message.from === 'teacher' && !message.read;

export function countUnread(messages: Message[], threadId?: string): number {
  return messages.filter((m) => isUnread(m) && (!threadId || m.threadId === threadId)).length;
}

const bySentAt = (a: Message, b: Message) => a.sentAt.localeCompare(b.sentAt);

/** The messages of one thread, oldest first. */
export function messagesInThread(messages: Message[], threadId: string): Message[] {
  return messages.filter((m) => m.threadId === threadId).sort(bySentAt);
}

export interface ThreadSummary {
  thread: Thread;
  teacher: Teacher | undefined;
  lastMessage: Message | undefined;
  unreadCount: number;
}

/** One row per thread for the inbox, the most recent conversation first. */
export function summariseThreads(
  threads: Thread[],
  teachers: Teacher[],
  messages: Message[],
): ThreadSummary[] {
  return threads
    .map((thread) => {
      const own = messagesInThread(messages, thread.id);
      return {
        thread,
        teacher: teachers.find((t) => t.id === thread.teacherId),
        lastMessage: own[own.length - 1],
        unreadCount: countUnread(own),
      };
    })
    .sort((a, b) => (b.lastMessage?.sentAt ?? '').localeCompare(a.lastMessage?.sentAt ?? ''));
}

// ---------------------------------------------------------------- hooks

/** Unread teacher messages across all threads (the nav badge). */
export function useUnreadCount(): number {
  return useMessagesStore((s) => countUnread(s.messages));
}

export function useThreadUnreadCount(threadId: string): number {
  return useMessagesStore((s) => countUnread(s.messages, threadId));
}

export function useThreadMessages(threadId: string | undefined): Message[] {
  const messages = useMessagesStore((s) => s.messages);
  return useMemo(() => (threadId ? messagesInThread(messages, threadId) : []), [messages, threadId]);
}

export function useThreadSummaries(): ThreadSummary[] {
  const threads = useMessagesStore((s) => s.threads);
  const teachers = useMessagesStore((s) => s.teachers);
  const messages = useMessagesStore((s) => s.messages);
  return useMemo(() => summariseThreads(threads, teachers, messages), [threads, teachers, messages]);
}

export function useThread(threadId: string | undefined): Thread | undefined {
  return useMessagesStore((s) => (threadId ? s.threads.find((t) => t.id === threadId) : undefined));
}

export function useTeacher(id: string | undefined): Teacher | undefined {
  return useMessagesStore((s) => (id ? s.teachers.find((t) => t.id === id) : undefined));
}

export function useAbsence(id: string | undefined): AbsenceRecord | undefined {
  return useMessagesStore((s) => (id ? s.absences.find((a) => a.id === id) : undefined));
}
