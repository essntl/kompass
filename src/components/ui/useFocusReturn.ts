import { useRef } from 'react';

/**
 * Radix only returns focus to a `Dialog.Trigger`. Our overlays are controlled
 * (`open` / `onOpenChange`) and have no trigger element, so we remember what
 * was focused when the overlay opened and hand focus back when it closes.
 *
 * Returns a handler for the content's `onCloseAutoFocus`.
 */
export function useFocusReturn(open: boolean): (event: Event) => void {
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  // Captured during render: effects (and Radix's focus scope) run after this,
  // so `document.activeElement` is still the element that opened the overlay.
  if (open && !wasOpen.current && typeof document !== 'undefined') {
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
  }
  wasOpen.current = open;

  return (event) => {
    const target = opener.current;
    if (target?.isConnected) {
      event.preventDefault();
      target.focus({ preventScroll: true });
    }
  };
}
