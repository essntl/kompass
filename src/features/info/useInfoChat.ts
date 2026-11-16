/**
 * Session store for the info corner's conversation.
 *
 * The state itself is the pure reducer in logic/conversation.ts; this store only holds it
 * in memory (not persisted: the thread lives for the session) and runs the streaming
 * request. Living outside React means an answer keeps streaming when the student opens a
 * topic page and comes back.
 */
import { create } from 'zustand';
import { isAbortError, isApiError, streamInfoAnswer } from '@/lib/api';
import { newId } from '@/lib/id';
import {
  conversationReducer,
  historyBefore,
  initialConversation,
  isBusy,
  lastTurn,
  normalizeQuestion,
  type ConversationAction,
  type ConversationState,
} from './logic/conversation';

interface InfoChatStore extends ConversationState {
  /** Asks a new question. Stops the answer in flight first. Returns false for an empty question. */
  ask: (question: string) => boolean;
  /** Stops the answer that is streaming now. */
  stop: () => void;
  /** Asks the last question again after an error. */
  retry: () => void;
  /** "Ny samtale": stops anything in flight and clears the thread. */
  reset: () => void;
}

const FALLBACK_ERROR = 'Noe gikk galt. Prøv igjen om litt.';

let controller: AbortController | null = null;

export const useInfoChat = create<InfoChatStore>()((set, get) => {
  const dispatch = (action: ConversationAction) =>
    set((state) => conversationReducer({ turns: state.turns }, action));

  function abortInFlight() {
    const last = lastTurn(get());
    controller?.abort();
    controller = null;
    if (last && isBusy(get())) dispatch({ type: 'stop', id: last.id });
  }

  async function run(turnId: string) {
    const turn = get().turns.find((entry) => entry.id === turnId);
    if (!turn) return;
    const own = new AbortController();
    controller = own;
    try {
      const { mock } = await streamInfoAnswer(
        { question: turn.question, history: historyBefore(get(), turnId) },
        {
          signal: own.signal,
          onDelta: (text) => dispatch({ type: 'delta', id: turnId, text }),
          onSources: (sources) => dispatch({ type: 'sources', id: turnId, sources }),
        },
      );
      dispatch({ type: 'done', id: turnId, mock });
    } catch (err) {
      // Stopped on purpose: the turn is already marked as stopped.
      if (isAbortError(err) || own.signal.aborted) return;
      dispatch({
        type: 'fail',
        id: turnId,
        error: isApiError(err)
          ? { code: err.code, message: err.message }
          : { code: 'INTERNAL', message: FALLBACK_ERROR },
      });
    } finally {
      if (controller === own) controller = null;
    }
  }

  return {
    ...initialConversation,

    ask(raw) {
      const question = normalizeQuestion(raw);
      if (!question) return false;
      abortInFlight();
      const id = newId('turn');
      dispatch({ type: 'ask', id, question });
      void run(id);
      return true;
    },

    stop: abortInFlight,

    retry() {
      const last = lastTurn(get());
      if (!last || (last.status !== 'error' && last.status !== 'stopped')) return;
      dispatch({ type: 'retry', id: last.id });
      void run(last.id);
    },

    reset() {
      controller?.abort();
      controller = null;
      dispatch({ type: 'reset' });
    },
  };
});
