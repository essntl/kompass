import { Info, MessageSquarePlus } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Chip, ChipGroup, Section } from '@/components/ui';
import { STARTER_QUESTIONS } from '../data/topics';
import { answerToSpeech } from '../logic/answerText';
import { isBusy, type Turn } from '../logic/conversation';
import { useInfoChat } from '../useInfoChat';
import { ConversationTurn } from './ConversationTurn';
import { QuestionComposer } from './QuestionComposer';

export interface AskPanelProps {
  /** Scroll to the newest question on mount (the student asked from a topic page). */
  revealThread?: boolean;
}

/** What the polite live region says: once when an answer starts, once when it is finished. */
function announcementFor(turn: Turn | undefined): string {
  if (!turn) return '';
  switch (turn.status) {
    case 'waiting':
    case 'streaming':
      return 'Kompass skriver et svar.';
    case 'done': {
      const count = turn.sources?.length ?? 0;
      const sources = count === 1 ? ' Én kilde under svaret.' : count > 1 ? ` ${count} kilder under svaret.` : '';
      return `Svar fra Kompass: ${answerToSpeech(turn.answer)}${sources}`;
    }
    case 'stopped':
      return 'Svaret ble stoppet.';
    // Errors are announced by the ErrorState (role="alert").
    case 'error':
      return '';
  }
}

/** The assistant: thread, question field, starter questions and the AI note. */
export function AskPanel({ revealThread = false }: AskPanelProps) {
  const turns = useInfoChat((state) => state.turns);
  const ask = useInfoChat((state) => state.ask);
  const stop = useInfoChat((state) => state.stop);
  const retry = useInfoChat((state) => state.retry);
  const reset = useInfoChat((state) => state.reset);
  const busy = isBusy({ turns });
  const last = turns[turns.length - 1];

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastQuestionRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Announce status changes only (never every token), and nothing for what was already
  // on screen when the page opened.
  const [announcement, setAnnouncement] = useState('');
  const seenStatus = useRef(last ? `${last.id}:${last.status}` : '');
  useEffect(() => {
    const key = last ? `${last.id}:${last.status}` : '';
    if (key === seenStatus.current) return;
    seenStatus.current = key;
    setAnnouncement(announcementFor(last));
  }, [last]);

  // Bring a new question into view. Skipped on mount unless asked to (topic page → here).
  const seenTurn = useRef(revealThread ? '' : last?.id);
  useEffect(() => {
    if (!last || last.id === seenTurn.current) return;
    seenTurn.current = last.id;
    lastQuestionRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }, [last, reduce]);

  function askStarter(question: string) {
    ask(question);
    inputRef.current?.focus({ preventScroll: true });
  }

  function stopAnswer() {
    stop();
    inputRef.current?.focus({ preventScroll: true });
  }

  function newConversation() {
    reset();
    inputRef.current?.focus();
  }

  return (
    <Section
      title="Spør veilederen"
      action={
        turns.length ? (
          <Button variant="ghost" size="sm" icon={<MessageSquarePlus />} onClick={newConversation}>
            Ny samtale
          </Button>
        ) : null
      }
    >
      <Card padding="lg" className="flex flex-col gap-5">
        {turns.length ? (
          <div className="flex flex-col gap-6">
            {turns.map((turn) => (
              <ConversationTurn
                key={turn.id}
                turn={turn}
                isLast={turn === last}
                onRetry={retry}
                questionRef={turn === last ? lastQuestionRef : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="text-body text-ink-2">
            Lurer du på noe om læretid, fagbrev eller rettighetene dine? Skriv spørsmålet ditt, eller
            velg et av forslagene.
          </p>
        )}

        <div className={turns.length ? 'border-t border-line pt-5' : undefined}>
          <QuestionComposer
            label={turns.length ? 'Oppfølgingsspørsmål' : 'Spørsmålet ditt'}
            busy={busy}
            onAsk={ask}
            onStop={stopAnswer}
            inputRef={inputRef}
          />
        </div>

        {turns.length === 0 ? (
          <ChipGroup label="Forslag til spørsmål">
            {STARTER_QUESTIONS.map((question) => (
              <Chip key={question} onClick={() => askStarter(question)}>
                {question}
              </Chip>
            ))}
          </ChipGroup>
        ) : null}

        <p className="flex items-start gap-2 text-caption text-ink-3">
          <Info aria-hidden className="mt-px size-4 shrink-0" />
          Svarene er laget av KI og kan inneholde feil. Det er kildene som gjelder.
        </p>
      </Card>

      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </Section>
  );
}
