import { Heart } from 'lucide-react';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import type { Listing } from '@shared/types';
import { cn } from '@/components/ui';
import { buttonClasses, type ButtonSize, type ButtonVariant } from '@/components/ui/buttonStyles';
import { EASE_OUT, tween } from '@/lib/motion';
import { useIsSaved } from '@/stores/apprenticeships';
import { useToggleSave } from '../useToggleSave';

/** Six sparks around the heart; alternating colours, angles slightly uneven so it reads organic. */
const SPARKS = [
  { angle: -90, distance: 19, color: 'bg-primary' },
  { angle: -30, distance: 17, color: 'bg-accent' },
  { angle: 25, distance: 19, color: 'bg-primary' },
  { angle: 90, distance: 16, color: 'bg-accent' },
  { angle: 150, distance: 19, color: 'bg-primary' },
  { angle: 210, distance: 17, color: 'bg-accent' },
] as const;

const POP = { type: 'spring', duration: 0.45, bounce: 0.5 } as const;

export interface SaveHeartProps {
  listing: Listing;
  variant?: Extract<ButtonVariant, 'ghost' | 'secondary'>;
  size?: Extract<ButtonSize, 'md' | 'lg'>;
  className?: string;
}

/**
 * The save toggle. A real toggle button (`aria-pressed`) whose label names the company.
 * Saving pops the heart with a spring and throws a small burst; un-saving just settles.
 * Under reduced motion only the fill changes.
 */
export function SaveHeart({ listing, variant = 'ghost', size = 'md', className }: SaveHeartProps) {
  const saved = useIsSaved(listing.id);
  const toggleSave = useToggleSave();
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const [burst, setBurst] = useState(0);

  function onClick() {
    const nowSaved = toggleSave(listing);
    if (reduce || !scope.current) return;
    if (nowSaved) {
      setBurst((n) => n + 1);
      animate(scope.current, { scale: [0.72, 1] }, POP);
    } else {
      animate(scope.current, { scale: [0.88, 1] }, tween.base);
    }
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`Lagre annonsen fra ${listing.company}`}
      title={saved ? 'Lagret' : 'Lagre'}
      onClick={onClick}
      className={cn(buttonClasses({ variant, size, iconOnly: true }), className)}
    >
      <span ref={scope} aria-hidden className="relative inline-flex">
        <Heart
          className={cn(
            'transition-[color,fill] duration-150 ease-out',
            saved ? 'fill-current text-primary' : 'fill-transparent text-ink-2',
          )}
        />
      </span>
      <AnimatePresence>
        {burst > 0 && saved && !reduce ? (
          <span key={burst} aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            {SPARKS.map((spark) => {
              const rad = (spark.angle * Math.PI) / 180;
              return (
                <motion.span
                  key={spark.angle}
                  className={cn('absolute size-1 rounded-full', spark.color)}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
                  animate={{
                    x: Math.cos(rad) * spark.distance,
                    y: Math.sin(rad) * spark.distance,
                    opacity: [0, 1, 0],
                    scale: [0.6, 1, 0.5],
                  }}
                  exit={{ opacity: 0, transition: tween.fast }}
                  transition={{
                    default: { duration: 0.5, ease: EASE_OUT, delay: 0.04 },
                    opacity: { duration: 0.5, ease: 'linear', delay: 0.04, times: [0, 0.3, 1] },
                    scale: { duration: 0.5, ease: EASE_OUT, delay: 0.04, times: [0, 0.3, 1] },
                  }}
                />
              );
            })}
          </span>
        ) : null}
      </AnimatePresence>
    </button>
  );
}
