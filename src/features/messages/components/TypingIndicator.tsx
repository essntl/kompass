import { motion } from 'motion/react';
import { tween } from '@/lib/motion';

/**
 * Three dots in a teacher bubble while a simulated reply is on its way. The dots pulse in
 * opacity only (it is a short-lived loading state, gone within four seconds), so reduced
 * motion keeps them as they are.
 */
export function TypingIndicator({ teacherName }: { teacherName: string }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: tween.base }}
      exit={{ opacity: 0, transition: tween.fast }}
      className="mt-3 flex"
    >
      <div className="relative flex h-10 items-center gap-1 rounded-lg rounded-bl-sm border border-line bg-surface px-4">
        <span className="sr-only">{teacherName} skriver</span>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="size-2 rounded-full bg-ink-3"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.16,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.li>
  );
}
