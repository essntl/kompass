import { cn } from '@/lib/cn';

const SIZES = { sm: 'size-4', md: 'size-5', lg: 'size-7' } as const;

export interface SpinnerProps {
  size?: keyof typeof SIZES;
  /** Announced to screen readers. Pass `null` when the spinner sits inside a labelled control. */
  label?: string | null;
  className?: string;
}

/**
 * Small activity indicator in the current text colour.
 * Use it inside buttons and for waits under ~300ms; use `Skeleton` for content.
 */
export function Spinner({ size = 'md', label = 'Laster', className }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex shrink-0', className)}
    >
      <svg viewBox="0 0 24 24" fill="none" className={cn('animate-spin-fast', SIZES[size])}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.22" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
