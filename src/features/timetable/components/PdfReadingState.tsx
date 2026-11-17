import { ScanText } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Card, Skeleton } from '@/components/ui';
import { fade } from '@/lib/motion';
import { pdfProgressText } from '../logic/importFile';

const PREVIEW_ROWS = 5;

/**
 * Shown while the AI reads a timetable PDF (10–30 seconds). A status line that moves
 * through the steps, and a skeleton in the shape of the preview that follows.
 */
export function PdfReadingState({ fileName }: { fileName: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - started), 500);
    return () => window.clearInterval(timer);
  }, []);

  const step = pdfProgressText(elapsed);
  const seconds = Math.floor(elapsed / 1000);

  return (
    <div aria-busy className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-ink [&_svg]:size-5">
          <ScanText />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Leser timeplanen fra PDF-en …</p>
          <div role="status" aria-live="polite" className="relative mt-0.5 h-5 text-small text-ink-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={step} variants={fade} initial="hidden" animate="show" exit="exit" className="truncate">
                {step}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <span className="shrink-0 pt-0.5 text-small text-ink-2 nums" aria-hidden>
          {seconds} s
        </span>
      </div>

      <p className="text-small text-ink-2">
        KI-en leser <span className="font-semibold text-ink">{fileName}</span>. Det tar vanligvis 10–30 sekunder.
      </p>

      <Card tone="primary-soft">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-2 h-4 w-52 max-w-full" />
      </Card>

      <div>
        <Skeleton className="mb-2 h-4 w-20" />
        <ul aria-hidden className="divide-y divide-line rounded-lg border border-line">
          {Array.from({ length: PREVIEW_ROWS }, (_, index) => (
            <li key={index} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-4 w-20 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className={index % 2 === 0 ? 'h-4 w-3/5' : 'h-4 w-2/5'} />
                <Skeleton className="h-3.5 w-1/3" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
