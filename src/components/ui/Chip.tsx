import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ChipProps extends ComponentPropsWithRef<'button'> {
  /**
   * Filter chips: pass a boolean and the chip becomes a toggle (`aria-pressed`).
   * Leave undefined for a one-shot suggestion chip ("Hva er et fagbrev?").
   */
  selected?: boolean;
  /** Leading icon, e.g. `<Bus />`. */
  icon?: ReactNode;
}

/**
 * Compact control for filters and suggestions. 36px tall with a
 * 44px hit area. The selected state swaps outline for a solid fill, so it does
 * not rely on hue alone.
 */
export function Chip({
  selected,
  icon,
  className,
  children,
  type = 'button',
  disabled,
  ...rest
}: ChipProps) {
  const isToggle = selected !== undefined;
  return (
    <button
      type={type}
      aria-pressed={isToggle ? selected : undefined}
      disabled={disabled}
      className={cn(
        'hit-44 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm border px-3',
        'text-small font-medium whitespace-nowrap [&_svg]:size-4',
        'transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-45',
        selected
          ? 'border-primary bg-primary text-primary-ink'
          : isToggle
            ? 'border-line-strong bg-surface text-ink-2 hover:bg-surface-hover hover:text-ink'
            : 'border-transparent bg-primary-soft text-primary-soft-ink hover:bg-primary-soft-hover',
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden className="-ml-0.5 inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}

export interface ChipGroupProps extends ComponentPropsWithRef<'div'> {
  /** Names the group for screen readers, e.g. "Filtrer på fag". */
  label?: string;
  /**
   * `wrap` (default) lets chips flow onto several lines.
   * `scroll` keeps one line that scrolls sideways and bleeds to the screen edge.
   */
  layout?: 'wrap' | 'scroll';
}

export function ChipGroup({
  label,
  layout = 'wrap',
  className,
  children,
  ...rest
}: ChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex gap-2',
        layout === 'wrap'
          ? 'flex-wrap'
          : 'no-scrollbar -mx-(--gutter) snap-x overflow-x-auto overscroll-x-contain px-(--gutter) py-1',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
