import { SendHorizontal } from 'lucide-react';
import { forwardRef, type KeyboardEvent } from 'react';
import { IconButton, Textarea, useMediaQuery } from '@/components/ui';
import { sendChatMessage } from '../logic/flows';
import { useMessagesUiStore } from '../store';

/** Hardware keyboard and a real pointer: Enter sends, Shift+Enter makes a new line. */
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

export interface ComposerProps {
  threadId: string;
  teacherName: string;
  /** Called right after a message went out (the chat scrolls to it). */
  onSent: () => void;
}

/**
 * Auto-growing message field with a send button. The draft lives in the feature store,
 * so it survives switching threads.
 */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { threadId, teacherName, onSent },
  ref,
) {
  const draft = useMessagesUiStore((s) => s.drafts[threadId] ?? '');
  const setDraft = useMessagesUiStore((s) => s.setDraft);
  const enterSends = useMediaQuery(FINE_POINTER);
  const canSend = draft.trim().length > 0;

  function send() {
    if (sendChatMessage(threadId, draft)) onSent();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!enterSends || event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing)
      return;
    event.preventDefault();
    send();
  }

  return (
    <form
      className="flex shrink-0 items-end gap-2 pt-1 pb-3 desktop:pb-0"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <div className="min-w-0 flex-1">
        <Textarea
          ref={ref}
          aria-label={`Melding til ${teacherName}`}
          placeholder="Skriv en melding"
          rows={1}
          autoGrow
          maxLength={2000}
          value={draft}
          enterKeyHint={enterSends ? 'send' : 'enter'}
          onChange={(event) => setDraft(threadId, event.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      <IconButton
        type="submit"
        variant="primary"
        label="Send melding"
        icon={<SendHorizontal />}
        disabled={!canSend}
        className="mb-0.5"
        // Keep focus (and the phone keyboard) in the field when the button is tapped.
        onPointerDown={(event) => event.preventDefault()}
      />
    </form>
  );
});
