import { motion, useReducedMotion } from 'motion/react';
import { spring } from '@/lib/motion';

/**
 * The success mark after "Send fravær": the disc pops in (from 0.9, never 0) and the tick
 * draws itself just before the disc settles. Reduced motion shows both at once.
 */
export function SuccessCheck() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring.pop}
      className="grid size-16 place-items-center rounded-full bg-success-soft text-success-soft-ink"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.28, delay: 0.12, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    </motion.span>
  );
}
