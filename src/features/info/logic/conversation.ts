/**
 * Conversation state for the info corner's assistant, as a pure reducer.
 *
 * One turn = one question and the answer streaming back for it. Only the newest turn can
 * be in flight; actions for any other turn id are ignored, so late deltas from a request
 * that was stopped or replaced can never leak into the thread.
 */
import type { InfoAskRequest } from '@shared/api';
import type { RecommendedSource } from '@shared/types';

export type TurnStatus = 'waiting' | 'streaming' | 'done' | 'stopped' | 'error';

export interface TurnError {
  code: string;
  /** Norwegian, safe to show. */
  message: string;
}

export interface Turn {
  id: string;
  question: string;
  /** Plain text as received so far (blank lines between paragraphs, `- ` list lines). */
  answer: string;
  status: TurnStatus;
  /** Null until the `sources` event arrives. */
  sources: RecommendedSource[] | null;
  /** True when the server answered in mock mode. */
  mock: boolean;
  error?: TurnError;
}

export interface ConversationState {
  turns: Turn[];
}

export type ConversationAction =
  | { type: 'ask'; id: string; question: string }
  | { type: 'delta'; id: string; text: string }
  | { type: 'sources'; id: string; sources: RecommendedSource[] }
  | { type: 'done'; id: string; mock: boolean }
  | { type: 'stop'; id: string }
  | { type: 'fail'; id: string; error: TurnError }
  | { type: 'retry'; id: string }
  | { type: 'reset' };

/** The thread is short on purpose: older turns fall off the top. */
export const MAX_TURNS = 8;
/** Earlier messages sent along as `history` (matches the server's MAX_HISTORY_TURNS). */
export const MAX_HISTORY_MESSAGES = 6;
/** The server rejects history entries longer than this. */
const MAX_HISTORY_TEXT = 6000;
/** The server rejects questions longer than this. */
export const MAX_QUESTION_LENGTH = 1000;

export const initialConversation: ConversationState = { turns: [] };

export function isInFlight(turn: Turn | undefined): boolean {
  return turn?.status === 'waiting' || turn?.status === 'streaming';
}

export function lastTurn(state: ConversationState): Turn | undefined {
  return state.turns[state.turns.length - 1];
}

export function isBusy(state: ConversationState): boolean {
  return isInFlight(lastTurn(state));
}

/** Trims whitespace and collapses runs of spaces; returns '' for an empty question. */
export function normalizeQuestion(raw: string): string {
  return raw.replace(/[ \t]+/g, ' ').trim().slice(0, MAX_QUESTION_LENGTH);
}

function updateLast(
  state: ConversationState,
  id: string,
  update: (turn: Turn) => Turn | null,
): ConversationState {
  const last = lastTurn(state);
  if (!last || last.id !== id) return state;
  const next = update(last);
  if (!next || next === last) return state;
  return { turns: [...state.turns.slice(0, -1), next] };
}

export function conversationReducer(
  state: ConversationState,
  action: ConversationAction,
): ConversationState {
  switch (action.type) {
    case 'ask': {
      const question = normalizeQuestion(action.question);
      if (!question || isBusy(state)) return state;
      const turn: Turn = {
        id: action.id,
        question,
        answer: '',
        status: 'waiting',
        sources: null,
        mock: false,
      };
      return { turns: [...state.turns, turn].slice(-MAX_TURNS) };
    }
    case 'delta':
      return updateLast(state, action.id, (turn) =>
        isInFlight(turn) && action.text
          ? { ...turn, status: 'streaming', answer: turn.answer + action.text }
          : null,
      );
    case 'sources':
      return updateLast(state, action.id, (turn) =>
        isInFlight(turn) ? { ...turn, sources: action.sources } : null,
      );
    case 'done':
      return updateLast(state, action.id, (turn) =>
        isInFlight(turn) ? { ...turn, status: 'done', mock: action.mock, sources: turn.sources ?? [] } : null,
      );
    case 'stop':
      return updateLast(state, action.id, (turn) =>
        isInFlight(turn) ? { ...turn, status: 'stopped' } : null,
      );
    case 'fail':
      return updateLast(state, action.id, (turn) =>
        isInFlight(turn) ? { ...turn, status: 'error', error: action.error } : null,
      );
    case 'retry':
      return updateLast(state, action.id, (turn) =>
        turn.status === 'error' || turn.status === 'stopped'
          ? { ...turn, status: 'waiting', answer: '', sources: null, mock: false, error: undefined }
          : null,
      );
    case 'reset':
      return state.turns.length ? initialConversation : state;
  }
}

/**
 * The `history` sent with the turn `turnId`: earlier finished turns only (an answer that
 * failed or was stopped half-way would mislead the model), newest last, at most
 * MAX_HISTORY_MESSAGES messages, always starting with a user message.
 */
export function historyBefore(state: ConversationState, turnId: string): InfoAskRequest['history'] {
  const index = state.turns.findIndex((turn) => turn.id === turnId);
  const earlier = index === -1 ? state.turns : state.turns.slice(0, index);
  const messages = earlier
    .filter((turn) => turn.status === 'done' && turn.answer.trim())
    .flatMap((turn) => [
      { role: 'user' as const, text: turn.question },
      { role: 'assistant' as const, text: turn.answer.trim().slice(0, MAX_HISTORY_TEXT) },
    ])
    .slice(-MAX_HISTORY_MESSAGES);
  while (messages.length && messages[0].role !== 'user') messages.shift();
  return messages.length ? messages : undefined;
}
