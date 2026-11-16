import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'motion/react';
import { useImperativeHandle, useRef, type PointerEvent, type ReactNode, type Ref } from 'react';
import { flushSync } from 'react-dom';

export interface SwipePagerHandle {
  /** Slides to the next (1) or previous (-1) page, like a swipe. */
  go: (direction: 1 | -1) => void;
}

export interface SwipePagerProps {
  ref?: Ref<SwipePagerHandle>;
  /** Renders the page at an offset from the current one (-1, 0, 1). */
  renderPage: (offset: -1 | 0 | 1) => ReactNode;
  /** Called when a slide has landed; the parent moves its date by `direction`. */
  onCommit: (direction: 1 | -1) => void;
}

/** Pixels the finger must travel before we decide the gesture is horizontal. */
const LOCK_DISTANCE = 8;
/** How far ahead (s) the release velocity is projected when deciding to change page. */
const PROJECTION = 0.2;
const SETTLE = { type: 'spring', duration: 0.42, bounce: 0 } as const;
const SNAP_BACK = { type: 'spring', duration: 0.3, bounce: 0 } as const;

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  /** `x` when the finger landed (non-zero when a slide was caught mid-flight). */
  base: number;
  locked: boolean;
  lastX: number;
  lastT: number;
  /** px/s, smoothed. */
  velocity: number;
}

/**
 * Horizontal pager for the day and week views. The neighbouring pages sit left and
 * right of the current one, so a swipe reveals the real previous/next day under the
 * finger. Track phase: `x` follows the finger 1:1. Release: a spring seeded with the
 * finger's velocity either lands on the neighbour (then the parent moves the date and
 * `x` resets in the same frame) or snaps back. Vertical page scroll stays native
 * (`touch-action: pan-y`); mouse users use the arrow buttons and keys.
 */
export function SwipePager({ ref, renderPage, onCommit }: SwipePagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const animation = useRef<AnimationPlaybackControls | null>(null);
  /** Direction of a slide that is in flight and still has to be committed. */
  const pending = useRef<1 | -1 | null>(null);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  function commit(direction: 1 | -1) {
    pending.current = null;
    flushSync(() => onCommit(direction));
    x.set(0);
  }

  /** Lands an in-flight slide immediately (before a new one starts). */
  function finishPending() {
    animation.current?.stop();
    animation.current = null;
    if (pending.current) commit(pending.current);
  }

  function settle(direction: 1 | -1 | 0, velocity = 0) {
    animation.current?.stop();
    const width = containerRef.current?.offsetWidth ?? 0;
    if (direction === 0) {
      pending.current = null;
      if (reduceMotion) x.set(0);
      else animation.current = animate(x, 0, { ...SNAP_BACK, velocity });
      return;
    }
    if (reduceMotion || width === 0) {
      commit(direction);
      return;
    }
    pending.current = direction;
    animation.current = animate(x, -direction * width, {
      ...SETTLE,
      velocity,
      onComplete: () => {
        if (pending.current === direction) commit(direction);
      },
    });
  }

  useImperativeHandle(ref, () => ({
    go: (direction) => {
      finishPending();
      settle(direction);
    },
  }));

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' || drag.current) return; // one finger only
    // Catch a slide mid-flight: it stops where it is and the finger takes over.
    animation.current?.stop();
    animation.current = null;
    pending.current = null;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      base: x.get(),
      locked: false,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.locked) {
      if (Math.abs(dx) > LOCK_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.2) {
        state.locked = true;
        containerRef.current?.setPointerCapture(event.pointerId);
      } else if (Math.abs(dy) > LOCK_DISTANCE) {
        // A vertical scroll: let the page have it.
        release(false);
        return;
      } else {
        return;
      }
    }
    const dt = event.timeStamp - state.lastT;
    if (dt > 0) {
      const instant = ((event.clientX - state.lastX) / dt) * 1000;
      state.velocity = state.velocity * 0.6 + instant * 0.4;
    }
    state.lastX = event.clientX;
    state.lastT = event.timeStamp;
    x.set(state.base + dx);
  }

  function release(decide: boolean) {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    const width = containerRef.current?.offsetWidth ?? 1;
    if (!state.locked) {
      // Released a caught slide without moving: finish it towards the nearer page.
      if (state.base !== 0) settle(state.base < -width / 2 ? 1 : state.base > width / 2 ? -1 : 0);
      return;
    }
    // The click (if any) is dispatched right after pointerup; clear the flag after it.
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    if (!decide) {
      settle(0);
      return;
    }
    const projected = x.get() + state.velocity * PROJECTION;
    if (projected < -width / 2) settle(1, state.velocity);
    else if (projected > width / 2) settle(-1, state.velocity);
    else settle(0, state.velocity);
  }

  return (
    <div
      ref={containerRef}
      className="relative touch-pan-y overflow-clip"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => release(true)}
      onPointerCancel={() => release(false)}
      // A drag must not end as a tap on the event under the finger.
      onClickCapture={(event) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <motion.div style={{ x }} className="relative">
        <div aria-hidden inert className="absolute top-0 right-full w-full">
          {renderPage(-1)}
        </div>
        {renderPage(0)}
        <div aria-hidden inert className="absolute top-0 left-full w-full">
          {renderPage(1)}
        </div>
      </motion.div>
    </div>
  );
}
