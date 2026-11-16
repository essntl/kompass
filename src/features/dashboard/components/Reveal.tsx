import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { staggerItem } from '@/lib/motion';

export interface RevealProps {
  className?: string;
  children?: ReactNode;
}

/**
 * One block of the dashboard's entrance wave. It inherits the `hidden` → `show` variant
 * from the page container, which spaces the blocks with `staggerDelay`.
 */
export function Reveal({ className, children }: RevealProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
