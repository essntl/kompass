import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/*
 * Press feedback lives here so every tappable thing answers the same way:
 * scale to 0.97 on pointer-down, 150ms ease-out. `scale` is listed explicitly
 * (never `transition: all`) – Tailwind 4 uses the `scale` property, not `transform`.
 */
export const PRESS =
  'transition-[scale,background-color,border-color,color,opacity] duration-150 ease-out active:scale-[0.97]';

const BASE =
  'relative inline-flex items-center justify-center font-semibold whitespace-nowrap ' +
  'disabled:pointer-events-none aria-disabled:pointer-events-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-ink hover:bg-primary-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-hover',
  soft: 'bg-primary-soft text-primary-soft-ink hover:bg-primary-soft-hover',
  ghost: 'text-ink hover:bg-ink/6 active:bg-ink/10',
  danger: 'bg-danger text-danger-ink hover:bg-danger-hover',
};

/* sm is 36px tall but keeps a 44px hit area through `hit-44`. */
const SIZES: Record<ButtonSize, string> = {
  sm: 'hit-44 h-9 rounded-md px-3 text-small [&_svg]:size-4',
  md: 'h-11 rounded-md px-4 text-body [&_svg]:size-5',
  lg: 'h-13 rounded-md px-5 text-body [&_svg]:size-5',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'hit-44 size-9 rounded-full [&_svg]:size-5',
  md: 'size-11 rounded-full [&_svg]:size-5',
  lg: 'size-13 rounded-full [&_svg]:size-6',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Square, circular icon-only button. */
  iconOnly?: boolean;
  /** Dimmed (disabled but not loading). */
  dimmed?: boolean;
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth,
  iconOnly,
  dimmed,
}: ButtonStyleOptions = {}): string {
  return cn(
    BASE,
    PRESS,
    VARIANTS[variant],
    iconOnly ? ICON_SIZES[size] : SIZES[size],
    // Full-width buttons may shrink, so two of them in a row share the space equally.
    fullWidth ? 'w-full min-w-0' : 'shrink-0',
    dimmed && 'opacity-45',
  );
}
