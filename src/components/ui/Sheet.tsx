import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';
import { useFocusReturn } from './useFocusReturn';
import { useIsDesktop } from './useMediaQuery';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown in the header and wired to `aria-labelledby`. */
  title: string;
  /** One line under the title, wired to `aria-describedby`. */
  description?: ReactNode;
  /**
   * Sticky action area, usually one or two buttons. Stays above the home
   * indicator and the on-screen keyboard.
   */
  footer?: ReactNode;
  /** Desktop dialog width: sm 420px, md 520px (default), lg 680px. */
  size?: 'sm' | 'md' | 'lg';
  /** `false` blocks Esc, outside click and drag-to-dismiss (e.g. while saving). */
  dismissible?: boolean;
  /** Removes the body padding, for edge-to-edge content such as lists or images. */
  flush?: boolean;
  className?: string;
  children?: ReactNode;
}

const DESKTOP_WIDTH = { sm: 'max-w-[420px]', md: 'max-w-[520px]', lg: 'max-w-[680px]' } as const;

/**
 * The workhorse for forms and detail views.
 *  - Mobile: bottom sheet (vaul) that follows the finger and can be flicked away.
 *  - Desktop (≥1024px): centred dialog (Radix).
 * Both trap focus, close on Esc, lock page scroll and return focus to the trigger.
 *
 * Put a `<form id="x">` in the body and a `<Button type="submit" form="x">` in the
 * footer to submit with the keyboard's return key.
 */
export function Sheet(props: SheetProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopDialog {...props} /> : <MobileSheet {...props} />;
}

function SheetHeader({
  title,
  description,
  Title,
  Description,
  Close,
  closable,
}: {
  title: string;
  description?: ReactNode;
  closable: boolean;
  Title: typeof Dialog.Title;
  Description: typeof Dialog.Description;
  Close: typeof Dialog.Close;
}) {
  return (
    <div className="flex shrink-0 items-start gap-3 pt-1 pr-2 pb-3 pl-4 desktop:pt-4 desktop:pr-3 desktop:pl-6">
      <div className="min-w-0 flex-1 pt-2">
        <Title className="font-display text-heading font-semibold text-ink">{title}</Title>
        {description ? (
          <Description className="mt-1 text-small text-ink-2">{description}</Description>
        ) : null}
      </div>
      {closable ? (
        <Close asChild>
          <IconButton label="Lukk" icon={<X />} />
        </Close>
      ) : (
        <span aria-hidden className="size-11" />
      )}
    </div>
  );
}

function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  dismissible = true,
  flush,
  className,
  children,
}: SheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocus = useFocusReturn(open);
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Drawer.Content
          ref={contentRef}
          // Radix warns when there is no description unless this is explicit.
          {...(description ? {} : { 'aria-describedby': undefined })}
          // Move focus into the sheet, but onto the sheet itself: focusing the
          // first input would throw the keyboard up before the user asked for it.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            contentRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={returnFocus}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col outline-none',
            'max-h-[calc(100dvh-var(--safe-top)-16px)]',
            'rounded-t-xl border-t border-line bg-surface text-ink shadow-3',
            className,
          )}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong" />
          <SheetHeader
            title={title}
            description={description}
            closable={dismissible}
            Title={Drawer.Title}
            Description={Drawer.Description}
            Close={Drawer.Close}
          />
          <div
            className={cn(
              'scroll-area min-h-0 flex-1',
              !flush && 'px-4',
              footer ? !flush && 'pb-4' : 'pb-[max(16px,var(--safe-bottom))]',
            )}
          >
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-line px-4 pt-3 pb-[max(12px,var(--safe-bottom))]">
              {footer}
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function DesktopDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size = 'md',
  dismissible = true,
  flush,
  className,
  children,
}: SheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocus = useFocusReturn(open);
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (dismissible || next) && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-overlay p-8',
            'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out',
          )}
        >
          <Dialog.Content
            ref={contentRef}
            {...(description ? {} : { 'aria-describedby': undefined })}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              contentRef.current?.focus({ preventScroll: true });
            }}
            onCloseAutoFocus={returnFocus}
            onEscapeKeyDown={(event) => !dismissible && event.preventDefault()}
            onPointerDownOutside={(event) => !dismissible && event.preventDefault()}
            onInteractOutside={(event) => !dismissible && event.preventDefault()}
            className={cn(
              'relative flex max-h-[min(760px,calc(100dvh-64px))] w-full flex-col outline-none',
              'rounded-xl border border-line bg-surface text-ink shadow-3',
              'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
              DESKTOP_WIDTH[size],
              className,
            )}
          >
            <SheetHeader
              title={title}
              description={description}
              closable={dismissible}
              Title={Dialog.Title}
              Description={Dialog.Description}
              Close={Dialog.Close}
            />
            <div className={cn('scroll-area min-h-0 flex-1', !flush && 'px-6', !flush && 'pb-6')}>
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-line px-6 py-4">{footer}</div>
            ) : null}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
