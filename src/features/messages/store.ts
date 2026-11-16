import { create } from 'zustand';
import type { AbsenceInput } from '@/lib/absence';

/**
 * Feature-local UI state for Meldinger. Deliberately not persisted: it only has to survive
 * navigation within the session (a pending suggestion card, a half-written draft, a teacher
 * who is "typing"), and it disappears with a reload like the timers that feed it.
 */

export type SuggestionStatus = 'pending' | 'added' | 'dismissed';

export interface AbsenceSuggestion {
  /** The chat message the suggestion belongs to. */
  messageId: string;
  threadId: string;
  /** What "Legg til" will report (source 'ai'). */
  input: AbsenceInput;
  /** True when the backend answered in mock mode. */
  mock: boolean;
  status: SuggestionStatus;
  /** Set once the absence is registered. */
  absenceId?: string;
}

export interface MessagesUiState {
  /** Keyed by message id. */
  suggestions: Record<string, AbsenceSuggestion>;
  /** Thread ids where the teacher is "typing" a simulated reply. */
  typing: Record<string, boolean>;
  /** Unsent composer text per thread. */
  drafts: Record<string, string>;

  addSuggestion: (suggestion: AbsenceSuggestion) => void;
  updateSuggestion: (messageId: string, patch: Partial<AbsenceSuggestion>) => void;
  setTyping: (threadId: string, typing: boolean) => void;
  setDraft: (threadId: string, text: string) => void;
}

export const useMessagesUiStore = create<MessagesUiState>()((set) => ({
  suggestions: {},
  typing: {},
  drafts: {},

  addSuggestion: (suggestion) =>
    set((s) => ({
      suggestions: { ...s.suggestions, [suggestion.messageId]: suggestion },
    })),
  updateSuggestion: (messageId, patch) =>
    set((s) => {
      const current = s.suggestions[messageId];
      if (!current) return s;
      return {
        suggestions: {
          ...s.suggestions,
          [messageId]: { ...current, ...patch, messageId },
        },
      };
    }),
  setTyping: (threadId, typing) =>
    set((s) => {
      if (!!s.typing[threadId] === typing) return s;
      const next = { ...s.typing };
      if (typing) next[threadId] = true;
      else delete next[threadId];
      return { typing: next };
    }),
  setDraft: (threadId, text) =>
    set((s) => {
      if ((s.drafts[threadId] ?? '') === text) return s;
      const next = { ...s.drafts };
      if (text) next[threadId] = text;
      else delete next[threadId];
      return { drafts: next };
    }),
}));

export function useSuggestion(messageId: string): AbsenceSuggestion | undefined {
  return useMessagesUiStore((s) => s.suggestions[messageId]);
}

export function useIsTeacherTyping(threadId: string | undefined): boolean {
  return useMessagesUiStore((s) => (threadId ? !!s.typing[threadId] : false));
}
