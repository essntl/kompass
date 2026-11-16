import { Check } from 'lucide-react';
import { cn } from '@/components/ui';

export interface StepIndicatorProps {
  steps: readonly string[];
  /** Zero-based index of the current step. */
  current: number;
}

/**
 * "1 Arbeid — 2 Tekst — 3 Send". Done steps show a check, the current one is filled.
 * Colour changes are plain transitions: this redraws on every step change, so no motion.
 */
export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-2" aria-label="Steg i søknaden">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={cn('flex min-w-0 items-center gap-2', index < steps.length - 1 && 'flex-1')}
          >
            <span
              className={cn(
                'nums grid size-7 shrink-0 place-items-center rounded-full border text-caption font-semibold',
                'transition-[background-color,border-color,color] duration-200 ease-out',
                active && 'border-primary bg-primary text-primary-ink',
                done && 'border-primary-soft bg-primary-soft text-primary-soft-ink',
                !active && !done && 'border-line-strong bg-surface text-ink-2',
              )}
            >
              {done ? <Check aria-hidden className="size-4" /> : index + 1}
            </span>
            <span
              className={cn(
                'truncate text-small',
                active ? 'font-semibold text-ink' : 'text-ink-2',
              )}
            >
              {label}
              {done ? <span className="sr-only"> (ferdig)</span> : null}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  'h-px min-w-3 flex-1 transition-colors duration-200',
                  done ? 'bg-primary' : 'bg-line-strong',
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
