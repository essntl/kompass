import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { collapse } from '@/lib/motion';

export interface CollapseProps {
  open: boolean;
  /** Give this to the trigger's `aria-controls`. */
  id?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Expands and collapses its children by animating to their measured height.
 * Content is unmounted while closed, so nothing inside can take focus.
 * The trigger owns `aria-expanded`:
 *
 *   <button aria-expanded={open} aria-controls="alt" onClick={toggle}>Flere avganger</button>
 *   <Collapse id="alt" open={open}>…</Collapse>
 */
export function Collapse({ open, id, className, children }: CollapseProps) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="content"
          id={id}
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: reduce ? { duration: 0 } : collapse.open,
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: reduce ? { duration: 0 } : collapse.close,
          }}
          // `clip` keeps focus rings of the content visible once open, unlike `hidden`.
          style={{ overflow: 'clip' }}
        >
          <div className={className}>{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
