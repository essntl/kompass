import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type CardTone = 'default' | 'sunken' | 'primary' | 'primary-soft' | 'accent';
export type CardPadding = 'none' | 'md' | 'lg';

const TONES: Record<CardTone, string> = {
  default: 'border-line bg-surface text-ink',
  sunken: 'border-transparent bg-surface-2 text-ink',
  /** Solid brand fill for the one hero card on a page. */
  primary: 'border-transparent bg-primary text-primary-ink',
  'primary-soft': 'border-transparent bg-primary-soft text-primary-soft-ink',
  /** Soft amber: heads-up content ("Du rekker ikke første time"). */
  accent: 'border-transparent bg-accent-soft text-accent-soft-ink',
};

const INTERACTIVE: Record<CardTone, string> = {
  default: 'hover:border-line-strong hover:bg-surface-hover',
  sunken: 'hover:border-line-strong',
  primary: 'hover:bg-primary-hover',
  'primary-soft': 'hover:bg-primary-soft-hover',
  accent: 'hover:border-accent',
};

const PADDING: Record<CardPadding, string> = { none: '', md: 'p-4', lg: 'p-5' };

type CardOwnProps<T extends ElementType> = {
  /** Element or component to render, e.g. `as={Link}` or `as="button"`. Default `div`. */
  as?: T;
  /** Adds hover and press feedback. Combine with `as={Link}` / `as="button"`. */
  interactive?: boolean;
  /** md = 16px (default), lg = 20px (hero cards), none = you handle it. */
  padding?: CardPadding;
  tone?: CardTone;
  className?: string;
  children?: ReactNode;
};

export type CardProps<T extends ElementType = 'div'> = CardOwnProps<T> &
  Omit<ComponentPropsWithRef<T>, keyof CardOwnProps<T>>;

/** Flat surface with a hairline border. No shadow – cards do not float. */
export function Card<T extends ElementType = 'div'>({
  as,
  interactive = false,
  padding = 'md',
  tone = 'default',
  className,
  children,
  ...rest
}: CardProps<T>) {
  const Component: ElementType = as ?? 'div';
  return (
    <Component
      className={cn(
        'block border',
        padding === 'lg' ? 'rounded-xl' : 'rounded-lg',
        TONES[tone],
        PADDING[padding],
        interactive &&
          cn(
            'w-full cursor-pointer text-left',
            'transition-[scale,background-color,border-color] duration-150 ease-out active:scale-[0.98]',
            INTERACTIVE[tone],
          ),
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
