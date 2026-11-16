import * as Dialog from '@radix-ui/react-dialog';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { useFocusReturn } from './useFocusReturn';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A question that names the thing: "Slette oppføringen?" */
  title: string;
  /** What happens, in one sentence: "Bildet og beskrivelsen blir borte." */
  description?: ReactNode;
  /** A verb, never "OK" or "Ja". Default "Slett". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` (default) for destructive actions, `primary` for plain confirmations. */
  tone?: 'danger' | 'primary';
  /** Called when the user confirms. The dialog closes itself unless `loading` is set. */
  onConfirm: () => void;
  /** Keeps the dialog open with a spinner on the confirm button. */
  loading?: boolean;
}

/**
 * Small centred alert for actions that cannot be undone. Focus starts on
 * "Avbryt" so a stray Enter never deletes anything.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Slett',
  cancelLabel = 'Avbryt',
  tone = 'danger',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useFocusReturn(open);
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (loading ? undefined : onOpenChange(next))}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 grid place-items-center bg-overlay p-6',
            'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out',
          )}
        >
          <Dialog.Content
            role="alertdialog"
            {...(description ? {} : { 'aria-describedby': undefined })}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              cancelRef.current?.focus();
            }}
            onCloseAutoFocus={returnFocus}
            className={cn(
              'w-full max-w-[360px] rounded-xl border border-line bg-surface p-5 text-ink shadow-3 outline-none',
              'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
            )}
          >
            <Dialog.Title className="font-display text-heading font-semibold">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-2 text-body text-ink-2">
                {description}
              </Dialog.Description>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 desktop:flex-row desktop:justify-end">
              <Button
                ref={cancelRef}
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              <Button
                variant={tone}
                loading={loading}
                onClick={() => {
                  onConfirm();
                  if (!loading) onOpenChange(false);
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
