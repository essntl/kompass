import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/components/ui';
import { EASE_OUT, tween } from '@/lib/motion';
import { DemoNote } from './ReviewStep';

const CONFETTI = [
  { angle: -100, distance: 54, color: 'bg-primary', size: 'size-1.5' },
  { angle: -55, distance: 60, color: 'bg-accent', size: 'size-2' },
  { angle: -10, distance: 52, color: 'bg-subj-4', size: 'size-1.5' },
  { angle: 35, distance: 58, color: 'bg-primary', size: 'size-2' },
  { angle: 80, distance: 50, color: 'bg-accent', size: 'size-1.5' },
  { angle: 130, distance: 58, color: 'bg-subj-5', size: 'size-2' },
  { angle: 175, distance: 54, color: 'bg-primary', size: 'size-1.5' },
  { angle: 220, distance: 60, color: 'bg-accent', size: 'size-2' },
] as const;

export interface SuccessViewProps {
  company: string;
}

/**
 * Shown once per application, so it may celebrate a little: the check pops in on a
 * spring, a ring and a few dots burst outward as it lands, then the text rises in.
 * Reduced motion keeps only the fades.
 */
export function SuccessView({ company }: SuccessViewProps) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center px-2 py-8 text-center" role="status">
      <div className="relative grid size-20 place-items-center">
        {!reduce ? (
          <>
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-primary"
              initial={{ scale: 0.7, opacity: 0.6 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.12 }}
            />
            {CONFETTI.map((dot) => {
              const rad = (dot.angle * Math.PI) / 180;
              return (
                <motion.span
                  key={dot.angle}
                  aria-hidden
                  className={cn('absolute rounded-full', dot.size, dot.color)}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
                  animate={{
                    x: Math.cos(rad) * dot.distance,
                    y: Math.sin(rad) * dot.distance,
                    opacity: [0, 1, 0],
                    scale: 1,
                  }}
                  transition={{
                    default: { duration: 0.7, ease: EASE_OUT, delay: 0.12 },
                    opacity: { duration: 0.7, ease: 'linear', delay: 0.12, times: [0, 0.25, 1] },
                  }}
                />
              );
            })}
          </>
        ) : null}
        <motion.span
          aria-hidden
          className="relative grid size-20 place-items-center rounded-full bg-primary text-primary-ink"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ scale: { type: 'spring', duration: 0.5, bounce: 0.45 }, opacity: tween.fast }}
        >
          <Check className="size-10" strokeWidth={2.5} />
        </motion.span>
      </div>

      <motion.div
        className="mt-6 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...tween.slow, delay: 0.16 }}
      >
        <p className="font-display text-title font-semibold tracking-tight text-ink">Søknaden er sendt</p>
        <p className="max-w-[36ch] text-body text-ink-2">
          Søknaden til {company} er lagret under annonsen. Lykke til.
        </p>
        <div className="mt-4 max-w-[40ch] text-left">
          <DemoNote />
        </div>
      </motion.div>
    </div>
  );
}
