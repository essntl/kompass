/**
 * Motion for the portfolio lists. Built on the shared presets in `@/lib/motion`.
 *
 *  - Page load: items rise 8px and fade in, staggered with the shared shrinking gaps.
 *  - Filtering: items that stay glide to their new place (layout spring); items that
 *    leave are popped out of the layout at once (`popLayout`) and fade, so the gap closes
 *    while they go; items that arrive fade in from 96% in place, with no delay.
 */
import type { Variants } from 'motion/react';
import { spring, staggerDelay, tween } from '@/lib/motion';

export interface ItemCustom {
  /** Position in the list when it first appeared, for the stagger. */
  index: number;
  /** True only for the page's first render, where the list enters staggered. */
  entrance: boolean;
}

export const listItem: Variants = {
  hidden: ({ entrance }: ItemCustom) =>
    entrance ? { opacity: 0, y: 8 } : { opacity: 0, scale: 0.96 },
  show: ({ index, entrance }: ItemCustom) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...tween.slow, delay: entrance ? staggerDelay(index) : 0 },
  }),
  exit: { opacity: 0, scale: 0.96, transition: tween.fast },
};

export const layoutTransition = { layout: spring.layout } as const;

/** The grid ⇄ timeline swap: one cross-fade for the whole view, no stagger. */
export const viewSwap: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: tween.base },
  exit: { opacity: 0, transition: tween.fast },
};

/**
 * A month on the timeline. On page load its heading and rows carry the entrance, so the
 * group itself is simply there; when a filter brings a month back, the group fades in.
 */
export const monthGroup: Variants = {
  hidden: (entrance: boolean) => ({ opacity: entrance ? 1 : 0 }),
  show: { opacity: 1, transition: tween.base },
  exit: { opacity: 0, transition: tween.fast },
};
