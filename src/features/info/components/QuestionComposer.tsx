import { Send, Square } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type Ref } from 'react';
import { Button, Textarea, useMediaQuery } from '@/components/ui';
import { MAX_QUESTION_LENGTH } from '../logic/conversation';

export interface QuestionComposerProps {
  busy: boolean;
  /** Returns false when the question was not sent (empty). */
  onAsk: (question: string) => boolean;
  onStop: () => void;
  /** "Spørsmålet ditt" for the first question, "Oppfølgingsspørsmål" after that. */
  label: string;
  inputRef?: Ref<HTMLTextAreaElement>;
}

/** Hardware keyboard and a real pointer: Enter sends, Shift+Enter makes a new line. */
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/** The question field with its send button, which turns into "Stopp" while an answer streams. */
export function QuestionComposer({ busy, onAsk, onStop, label, inputRef }: QuestionComposerProps) {
  const [value, setValue] = useState('');
  const hintId = useId();
  // On touch screens Enter makes a new line and the button sends, so no keyboard hint.
  const enterSends = useMediaQuery(FINE_POINTER);

  function submit() {
    if (busy) return;
    if (onAsk(value)) setValue('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter makes a new line. Never while an IME is composing.
    if (enterSends && event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Textarea
        ref={inputRef}
        label={label}
        rows={2}
        autoGrow
        maxLength={MAX_QUESTION_LENGTH}
        placeholder="Spør om lærlingplass, fagbrev, rettigheter …"
        enterKeyHint={enterSends ? 'send' : 'enter'}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        aria-describedby={enterSends ? hintId : undefined}
      />
      <div className="flex items-center justify-between gap-3">
        {enterSends ? (
          <p id={hintId} className="min-w-0 text-caption text-ink-3">
            Enter sender, Shift+Enter gir ny linje.
          </p>
        ) : (
          <span />
        )}
        {busy ? (
          <Button type="button" variant="secondary" icon={<Square />} onClick={onStop}>
            Stopp
          </Button>
        ) : (
          <Button type="submit" icon={<Send />} disabled={!value.trim()}>
            Spør
          </Button>
        )}
      </div>
    </form>
  );
}
