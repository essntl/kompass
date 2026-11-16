import { FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui';
import { tween } from '@/lib/motion';
import { MAX_SELECTION } from '../logic';

export interface SelectionBarProps {
  open: boolean;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Sticky bar while picking entries for an application text. Sits above the bottom nav on
 * a phone and inside the content column on desktop. Slides up from the bottom edge it
 * belongs to and leaves the same way, faster.
 */
export function SelectionBar({ open, count, onCancel, onConfirm }: SelectionBarProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="selection-bar"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: tween.slow }}
          exit={{ y: '100%', opacity: 0, transition: tween.base }}
          className="fixed inset-x-0 bottom-(--shell-bottom) z-(--z-sticky) pr-(--safe-right) pl-[calc(var(--shell-left)+var(--safe-left))]"
        >
          <div className="mx-auto max-w-[1080px] px-(--gutter) pb-3 desktop:pb-6">
            <div
              role="region"
              aria-label="Valgte oppføringer"
              className="flex items-center gap-3 rounded-xl border border-line bg-surface py-2.5 pr-2.5 pl-4 shadow-2"
            >
              <p aria-live="polite" className="min-w-0 flex-1 text-small text-ink-2">
                <span className="font-semibold text-ink tabular-nums">
                  {count} av {MAX_SELECTION}
                </span>{' '}
                valgt
              </p>
              <Button variant="ghost" onClick={onCancel}>
                Avbryt
              </Button>
              <Button icon={<FileText />} disabled={count === 0} onClick={onConfirm}>
                Lag tekst
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
