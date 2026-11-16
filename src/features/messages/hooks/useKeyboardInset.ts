import { useEffect, useState } from 'react';

/** Smaller differences are browser chrome (URL bar) moving, not a keyboard. */
const KEYBOARD_THRESHOLD_PX = 120;

/**
 * Height of the on-screen keyboard where the browser overlays it on the page
 * (iOS Safari, Chrome's default `resizes-visual`): the part of the layout viewport the
 * visual viewport no longer shows. 0 when there is no keyboard or the browser already
 * shrinks the layout (then `100dvh` is right on its own).
 */
export function useKeyboardInset(enabled = true): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!enabled || !viewport) {
      setInset(0);
      return;
    }
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hidden = window.innerHeight - viewport.height - viewport.offsetTop;
        setInset(hidden > KEYBOARD_THRESHOLD_PX ? Math.round(hidden) : 0);
      });
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [enabled]);

  return inset;
}
