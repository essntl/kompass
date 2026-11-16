/**
 * Shared motion presets. Values mirror the CSS tokens in src/styles/tokens.css
 * (`--dur-*`, `--ease-*`) so CSS and JS motion feel like one system.
 *
 * Rules of thumb (see docs/contracts.md §4):
 *  - entering / leaving → `tween.base` (ease-out)
 *  - things the user can interrupt or drag (thumbs, indicators) → a spring
 *  - only transform and opacity; exits are shorter than enters
 */
import type { Transition, Variants } from 'motion/react';

type Bezier = [number, number, number, number];

export const EASE_OUT: Bezier = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT: Bezier = [0.65, 0, 0.35, 1];
export const EASE_DRAWER: Bezier = [0.32, 0.72, 0, 1];

/** Seconds. */
export const DUR = { fast: 0.12, base: 0.2, slow: 0.32 } as const;

export const tween = {
  fast: { type: 'tween', duration: DUR.fast, ease: EASE_OUT },
  base: { type: 'tween', duration: DUR.base, ease: EASE_OUT },
  slow: { type: 'tween', duration: DUR.slow, ease: EASE_OUT },
  /** For things that move across the screen rather than enter it. */
  move: { type: 'tween', duration: DUR.slow, ease: EASE_IN_OUT },
} as const satisfies Record<string, Transition>;

export const spring = {
  /** Sliding indicators (nav pill, tab underline): quick, no overshoot. */
  indicator: { type: 'spring', duration: 0.35, bounce: 0 },
  /** Small thumbs (switch): a hint of life. */
  thumb: { type: 'spring', duration: 0.3, bounce: 0.22 },
  /** Layout changes (cards re-flowing, lists closing a gap). */
  layout: { type: 'spring', duration: 0.4, bounce: 0 },
  /** Things that pop in (badges, check marks). */
  pop: { type: 'spring', duration: 0.3, bounce: 0.3 },
} as const satisfies Record<string, Transition>;

/**
 * Delay for the n-th child of a staggered group. The gaps shrink (44ms, 40ms, 36ms …)
 * and stop growing after `STAGGER_MAX_STEPS`, so a long list never queues: everything
 * past the first handful arrives together and the whole group lands in ~0.5s.
 */
export const STAGGER_MAX_STEPS = 7;
export function staggerDelay(index: number): number {
  const n = Math.min(index, STAGGER_MAX_STEPS);
  return 0.046 * n - 0.002 * n * n;
}

/** Page content entering after a navigation: fade + 8px rise. */
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: tween.base },
};

/** A single block entering: fade + 8px rise. Exit is a quicker fade, no travel. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: tween.slow },
  exit: { opacity: 0, transition: tween.fast },
};

/** Plain cross-fade, e.g. swapping skeleton → content. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: tween.base },
  exit: { opacity: 0, transition: tween.fast },
};

/** Parent of a staggered list. Use with `staggerItem` on the children. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { delayChildren: staggerDelay } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: tween.slow },
};

/** Bottom sheet sliding up by its own height (for custom sheets; `Sheet` uses vaul). */
export const sheet: Variants = {
  hidden: { y: '100%' },
  show: { y: 0, transition: { type: 'tween', duration: 0.42, ease: EASE_DRAWER } },
  exit: { y: '100%', transition: { type: 'tween', duration: 0.28, ease: EASE_DRAWER } },
};

/** Small things appearing in place (badge, check mark, toast icon). Never from scale 0. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: spring.pop },
  exit: { opacity: 0, scale: 0.95, transition: tween.fast },
};

/** Height expand/collapse used by `Collapse`. */
export const collapse = {
  open: { type: 'tween', duration: 0.26, ease: EASE_OUT },
  close: { type: 'tween', duration: DUR.base, ease: EASE_OUT },
} as const satisfies Record<string, Transition>;
