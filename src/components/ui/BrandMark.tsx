import { cn } from '@/lib/cn';

export interface BrandMarkProps {
  /** Tailwind size class, default `size-9`. */
  className?: string;
  /** Set when the mark stands alone without the word "Kompass" next to it. */
  title?: string;
}

/**
 * The Kompass mark: a compass needle on a spruce tile, north tip in hi-vis amber.
 * Same drawing as public/icon.svg, but coloured from the theme tokens.
 */
export function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('size-9 shrink-0', className)}
    >
      <rect width="512" height="512" rx="120" fill="var(--primary)" />
      <circle
        cx="256"
        cy="256"
        r="156"
        fill="none"
        stroke="var(--primary-ink)"
        strokeOpacity="0.3"
        strokeWidth="22"
      />
      <g transform="rotate(38 256 256)">
        <path d="M256 92 320 256H192Z" fill="var(--accent)" />
        <path d="M256 420 192 256h128Z" fill="var(--primary-ink)" />
      </g>
      <circle cx="256" cy="256" r="24" fill="var(--primary)" />
    </svg>
  );
}
