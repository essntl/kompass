/**
 * Shared-element transition for an entry's photo between the portfolio (card or timeline
 * row) and the entry page.
 *
 * Why not `layoutId`: Motion measures shared layouts in page space, and a route change
 * that also resets (or restores) the scroll position makes the element fly in from
 * wherever the old page was scrolled to. The shell's bottom nav ran into the same thing.
 *
 * Instead, a classic FLIP with a stand-in:
 *  1. `launchFlight` clones the photo element the user tapped and pins the clone, fixed,
 *     exactly over the original. The clone is in the document before the route changes,
 *     so an `idb:` object URL that the old page revokes on unmount is already decoded.
 *  2. The destination calls `useFlightLanding` on its photo. In a layout effect the real
 *     photo is hidden; one frame later (after the router has reset or restored the
 *     scroll) the destination is measured and the clone animates onto it with a
 *     compositor-only transform (WAAPI).
 *  3. When it lands, the real photo is shown and the clone removed.
 *
 * Interrupting is safe: launching while a clone is in the air re-uses that clone from
 * where it currently is, so going back halfway through an expand reverses smoothly.
 */
import { useLayoutEffect, type RefObject } from 'react';
import { DUR, EASE_DRAWER, EASE_OUT } from '@/lib/motion';

/** CSS `border-radius` of the photo at each place it can fly between, in px (TL TR BR BL). */
export type Radii = readonly [number, number, number, number];
export const RADII = {
  /** Image at the top of a card: the card is rounded-lg (16) and clips it. */
  card: [15, 15, 0, 0],
  /** Timeline thumbnail: rounded-md. */
  thumb: [12, 12, 12, 12],
  /** Entry page hero: rounded-xl. */
  hero: [24, 24, 24, 24],
} as const satisfies Record<string, Radii>;

interface Flight {
  entryId: string;
  clone: HTMLElement;
  radii: Radii;
  animation: Animation | null;
  /** Removes the clone if no destination claims it (the route failed to load, say). */
  orphanTimer: number;
}

let flight: Flight | null = null;

const FLIGHT_MS = 380;
const RETURN_MS = 320;
const ORPHAN_MS = 1500;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function px(radii: Radii, scaleX = 1, scaleY = 1): string {
  const x = radii.map((r) => `${r / scaleX}px`).join(' ');
  const y = radii.map((r) => `${r / scaleY}px`).join(' ');
  return `${x} / ${y}`;
}

function place(el: HTMLElement, rect: DOMRect) {
  Object.assign(el.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
}

function removeClone(target: Flight, fade: boolean) {
  window.clearTimeout(target.orphanTimer);
  target.animation?.cancel();
  if (flight === target) flight = null;
  const { clone } = target;
  if (!fade) {
    clone.remove();
    return;
  }
  const out = clone.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: DUR.fast * 1000,
    easing: `cubic-bezier(${EASE_OUT.join(',')})`,
    fill: 'forwards',
  });
  out.onfinish = () => clone.remove();
}

/**
 * Starts a flight from `source` (the photo element). Call it from the click that
 * navigates. Does nothing with reduced motion or when the element is off-screen.
 */
export function launchFlight(entryId: string, source: HTMLElement | null, radii: Radii): void {
  if (!source || prefersReducedMotion()) return;

  // A clone already in the air (an interrupted flight) continues from where it is.
  const current = flight;
  let clone: HTMLElement;
  let rect: DOMRect;
  if (current && current.entryId === entryId) {
    rect = current.clone.getBoundingClientRect();
    window.clearTimeout(current.orphanTimer);
    current.animation?.cancel();
    clone = current.clone;
  } else {
    if (current) removeClone(current, false);
    rect = source.getBoundingClientRect();
    if (rect.width === 0 || rect.bottom < 0 || rect.top > window.innerHeight) return;
    clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, {
      position: 'fixed',
      margin: '0',
      zIndex: '40',
      pointerEvents: 'none',
      overflow: 'hidden',
      transformOrigin: '0 0',
      visibility: 'visible',
    });
    document.body.appendChild(clone);
  }

  place(clone, rect);
  clone.style.transform = 'none';
  clone.style.borderRadius = px(radii);

  const next: Flight = { entryId, clone, radii, animation: null, orphanTimer: 0 };
  next.orphanTimer = window.setTimeout(() => removeClone(next, true), ORPHAN_MS);
  flight = next;
}

/** Sum of the translate of `el`'s ancestors (the page-enter rise), so we land on the resting spot. */
function ancestorTranslate(el: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const transform = getComputedStyle(node).transform;
    if (transform && transform !== 'none') {
      const matrix = new DOMMatrixReadOnly(transform);
      x += matrix.m41;
      y += matrix.m42;
    }
  }
  return { x, y };
}

function land(entryId: string, target: HTMLElement, radii: Radii, duration: number): void {
  const current = flight;
  if (!current || current.entryId !== entryId) {
    target.style.visibility = '';
    return;
  }
  const raw = target.getBoundingClientRect();
  const offset = ancestorTranslate(target);
  const to = new DOMRect(raw.left - offset.x, raw.top - offset.y, raw.width, raw.height);
  const onScreen = to.width > 0 && to.bottom > 0 && to.top < window.innerHeight;
  if (!onScreen) {
    target.style.visibility = '';
    removeClone(current, true);
    return;
  }

  const from = current.clone.getBoundingClientRect();
  const sx = from.width / to.width;
  const sy = from.height / to.height;
  const dx = from.left - to.left;
  const dy = from.top - to.top;

  window.clearTimeout(current.orphanTimer);
  const { clone } = current;
  place(clone, to);
  clone.style.borderRadius = px(radii);
  current.animation = clone.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderRadius: px(current.radii, sx, sy) },
      { transform: 'none', borderRadius: px(radii) },
    ],
    { duration, easing: `cubic-bezier(${EASE_DRAWER.join(',')})`, fill: 'forwards' },
  );
  current.radii = radii;
  current.animation.onfinish = () => {
    if (flight !== current) return;
    target.style.visibility = '';
    const waited = !photoReady(target);
    void whenPhotoReady(target, PHOTO_WAIT_MS).then(() => {
      if (flight !== current) return;
      // Let the real photo paint under the clone before the clone goes. If we had to wait
      // for it (an IndexedDB photo still decoding), cross-fade instead of cutting.
      requestAnimationFrame(() => removeClone(current, waited));
    });
  };
}

const PHOTO_WAIT_MS = 600;

/** EntryPhoto shows a `.skeleton` until its image has decoded. */
function photoReady(target: HTMLElement): boolean {
  return !target.querySelector('.skeleton');
}

function whenPhotoReady(target: HTMLElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    const check = () => {
      if (photoReady(target) || performance.now() - started > timeoutMs) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });
}

/** The entry whose photo is in the air, if any. */
export function pendingFlightEntryId(): string | null {
  return flight?.entryId ?? null;
}

/** True when a flight towards `entryId` (or any entry, without an id) is waiting to land. */
export function hasPendingFlight(entryId?: string): boolean {
  return flight !== null && (entryId === undefined || flight.entryId === entryId);
}

/**
 * Lands a pending flight for `entryId` on the element in `ref`. Hides the element until
 * the clone arrives. `kind` picks the duration: the expand is a touch longer than the return.
 */
export function useFlightLanding(
  entryId: string | undefined,
  ref: RefObject<HTMLElement | null>,
  radii: Radii,
  kind: 'expand' | 'return',
): void {
  useLayoutEffect(() => {
    const target = ref.current;
    if (!entryId || !target || !hasPendingFlight(entryId)) return;
    target.style.visibility = 'hidden';
    // Wait one frame: the router resets or restores the scroll in its own layout effect.
    const frame = requestAnimationFrame(() =>
      land(entryId, target, radii, kind === 'expand' ? FLIGHT_MS : RETURN_MS),
    );
    return () => {
      cancelAnimationFrame(frame);
      target.style.visibility = '';
    };
    // Landing is a mount-time event; later re-renders must not re-run it.
  }, [entryId]);
}

/**
 * Finds the photo for `entryId` among the portfolio's cards/rows (they carry
 * `data-entry-photo`) and lands a pending return flight on it.
 */
export function landOnPortfolio(root: HTMLElement | null, entryId: string): (() => void) | undefined {
  if (!root || !hasPendingFlight(entryId)) return undefined;
  const target = root.querySelector<HTMLElement>(`[data-entry-photo="${CSS.escape(entryId)}"]`);
  if (!target) {
    if (flight) removeClone(flight, true);
    return undefined;
  }
  const radii = target.dataset.photoShape === 'thumb' ? RADII.thumb : RADII.card;
  target.style.visibility = 'hidden';
  const frame = requestAnimationFrame(() => land(entryId, target, radii, RETURN_MS));
  return () => {
    cancelAnimationFrame(frame);
    target.style.visibility = '';
  };
}
