import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SectionProps {
  title: string;
  /** Right-aligned next to the title: a small `ButtonLink` ("Se alle") or an `IconButton`. */
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** A titled block of a page (`<section>` + `<h2>`). Pages space sections 24px apart. */
export function Section({ title, action, className, children }: SectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-3', className)}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 id={headingId} className="text-heading font-semibold text-ink">
          {title}
        </h2>
        {action ? <div className="flex shrink-0 items-center gap-1">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
