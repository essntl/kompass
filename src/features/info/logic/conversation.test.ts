import { describe, expect, it } from 'vitest';
import {
  conversationReducer,
  historyBefore,
  initialConversation,
  isBusy,
  MAX_TURNS,
  type ConversationAction,
  type ConversationState,
} from './conversation';

const source = { sourceId: 'vilbli-soke-laereplass', title: 'Hvordan søker du læreplass?', url: 'https://www.vilbli.no/x', why: 'Fristen.' };

function run(actions: ConversationAction[], state: ConversationState = initialConversation): ConversationState {
  return actions.reduce(conversationReducer, state);
}

function answered(id: string, question: string, answer: string): ConversationAction[] {
  return [
    { type: 'ask', id, question },
    { type: 'delta', id, text: answer },
    { type: 'done', id, mock: false },
  ];
}

describe('conversationReducer', () => {
  it('streams a turn from waiting to done', () => {
    let state = run([{ type: 'ask', id: 't1', question: '  Hva er  et fagbrev? ' }]);
    expect(state.turns[0]).toMatchObject({ question: 'Hva er et fagbrev?', status: 'waiting', answer: '' });
    expect(isBusy(state)).toBe(true);

    state = run(
      [
        { type: 'delta', id: 't1', text: 'Et fagbrev ' },
        { type: 'delta', id: 't1', text: 'er beviset.' },
      ],
      state,
    );
    expect(state.turns[0]).toMatchObject({ status: 'streaming', answer: 'Et fagbrev er beviset.' });

    state = run([{ type: 'sources', id: 't1', sources: [source] }, { type: 'done', id: 't1', mock: true }], state);
    expect(state.turns[0]).toMatchObject({ status: 'done', mock: true, sources: [source] });
    expect(isBusy(state)).toBe(false);
  });

  it('ignores empty questions and new questions while one is in flight', () => {
    expect(run([{ type: 'ask', id: 't1', question: '   ' }]).turns).toHaveLength(0);
    const state = run([
      { type: 'ask', id: 't1', question: 'Første' },
      { type: 'ask', id: 't2', question: 'Andre' },
    ]);
    expect(state.turns.map((turn) => turn.id)).toEqual(['t1']);
  });

  it('ignores events for a turn that is no longer in flight', () => {
    const stopped = run([
      { type: 'ask', id: 't1', question: 'Hva tjener en lærling?' },
      { type: 'delta', id: 't1', text: 'Lønnen øker' },
      { type: 'stop', id: 't1' },
      { type: 'delta', id: 't1', text: ' for hvert halvår.' },
      { type: 'sources', id: 't1', sources: [source] },
    ]);
    expect(stopped.turns[0]).toMatchObject({ status: 'stopped', answer: 'Lønnen øker', sources: null });

    const other = run([{ type: 'delta', id: 'unknown', text: 'x' }], stopped);
    expect(other).toBe(stopped);
  });

  it('keeps the partial answer on failure and clears it on retry', () => {
    let state = run([
      { type: 'ask', id: 't1', question: 'Hva er fraværsgrensen?' },
      { type: 'delta', id: 't1', text: 'Grensen' },
      { type: 'fail', id: 't1', error: { code: 'NETWORK', message: 'Fikk ikke kontakt.' } },
    ]);
    expect(state.turns[0]).toMatchObject({ status: 'error', error: { code: 'NETWORK' } });

    state = run([{ type: 'retry', id: 't1' }], state);
    expect(state.turns[0]).toMatchObject({ status: 'waiting', answer: '', error: undefined });
  });

  it('sets empty sources when done arrives without a sources event', () => {
    const state = run(answered('t1', 'Hei', 'Svar'));
    expect(state.turns[0].sources).toEqual([]);
  });

  it('keeps only the newest turns', () => {
    const actions = Array.from({ length: MAX_TURNS + 2 }, (_, i) => answered(`t${i}`, `Spørsmål ${i}`, 'Svar')).flat();
    const state = run(actions);
    expect(state.turns).toHaveLength(MAX_TURNS);
    expect(state.turns[0].id).toBe('t2');
  });

  it('resets the conversation', () => {
    expect(run([...answered('t1', 'Hei', 'Svar'), { type: 'reset' }]).turns).toEqual([]);
  });
});

describe('historyBefore', () => {
  it('sends earlier finished turns, newest last, without failed or stopped ones', () => {
    const state = run([
      ...answered('t1', 'Hva er en lærling?', 'En som lærer et yrke.'),
      { type: 'ask', id: 't2', question: 'Avbrutt' },
      { type: 'delta', id: 't2', text: 'Halv' },
      { type: 'stop', id: 't2' },
      ...answered('t3', 'Hva tjener de?', 'Det varierer.'),
      { type: 'ask', id: 't4', question: 'Og stipend?' },
    ]);
    expect(historyBefore(state, 't4')).toEqual([
      { role: 'user', text: 'Hva er en lærling?' },
      { role: 'assistant', text: 'En som lærer et yrke.' },
      { role: 'user', text: 'Hva tjener de?' },
      { role: 'assistant', text: 'Det varierer.' },
    ]);
  });

  it('caps the history at six messages, starting with a user message', () => {
    const actions = [1, 2, 3, 4].flatMap((n) => answered(`t${n}`, `Q${n}`, `A${n}`));
    const state = run([...actions, { type: 'ask', id: 't5', question: 'Q5' }]);
    const history = historyBefore(state, 't5')!;
    expect(history).toHaveLength(6);
    expect(history[0]).toEqual({ role: 'user', text: 'Q2' });
  });

  it('returns undefined for the first question', () => {
    const state = run([{ type: 'ask', id: 't1', question: 'Hei' }]);
    expect(historyBefore(state, 't1')).toBeUndefined();
  });
});
