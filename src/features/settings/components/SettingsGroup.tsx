import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SettingsGroupProps {
  title: string;
  /** One quiet line under the group, like a footnote in a native settings list. */
  footer?: ReactNode;
  /** `form` pads the card for fields; `list` leaves rows to pad themselves. */
  variant?: 'form' | 'list';
  className?: string;
  children: ReactNode;
}

/** A titled group of settings in one card, the grouped-list pattern of native settings. */
export function SettingsGroup({ title, footer, variant = 'form', className, children }: SettingsGroupProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-2', className)}>
      <h2 id={headingId} className="px-1 text-small font-semibold text-ink-2">
        {title}
      </h2>
      <div
        className={cn(
          'rounded-lg border border-line bg-surface',
          variant === 'form' ? 'flex flex-col gap-5 p-4' : 'flex flex-col divide-y divide-line',
        )}
      >
        {children}
      </div>
      {footer ? <p className="px-1 text-small text-ink-2">{footer}</p> : null}
    </section>
  );
}
