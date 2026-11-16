import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { staggerContainer, staggerItem } from '@/lib/motion';

const CONTAINERS = { div: motion.div, ul: motion.ul, ol: motion.ol, section: motion.section } as const;
const ITEMS = { div: motion.div, li: motion.li, article: motion.article } as const;

export interface StaggerProps {
  as?: keyof typeof CONTAINERS;
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  role?: string;
}

/**
 * Staggered entrance for a list that appears on mount (page load, tab switch).
 * Children must be `StaggerItem`s. Gaps shrink from ~44ms and stop after the
 * first handful, so long lists never queue.
 *
 * Do not use it for content the user opens many times a day (menus, sheet
 * bodies, rows that re-render on every keystroke) – those should just be there.
 */
export function Stagger({ as = 'div', className, children, ...rest }: StaggerProps) {
  const Component = CONTAINERS[as];
  return (
    <Component
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
      {...rest}
    >
      {children}
    </Component>
  );
}

export interface StaggerItemProps {
  as?: keyof typeof ITEMS;
  className?: string;
  children?: ReactNode;
}

/** One entry in a `Stagger`: fades in and rises 8px. */
export function StaggerItem({ as = 'div', className, children }: StaggerItemProps) {
  const Component = ITEMS[as];
  return (
    <Component variants={staggerItem} className={className}>
      {children}
    </Component>
  );
}
