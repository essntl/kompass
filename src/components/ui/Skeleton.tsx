import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';

export interface SkeletonProps extends ComponentPropsWithRef<'div'> {
  /** Shape it like the content it stands in for: `className="h-5 w-40"`, `"size-12 rounded-full"`. */
  className?: string;
}

/**
 * Placeholder block with a soft sheen. Build the loading state out of a few of
 * these in the shape of the real content, and put `aria-busy` on the container.
 */
export function Skeleton({ className, ...rest }: SkeletonProps) {
  return <div aria-hidden className={cn('skeleton rounded-sm', className)} {...rest} />;
}

export interface SkeletonTextProps {
  /** Number of lines. The last one is shorter, like a real paragraph. */
  lines?: number;
  className?: string;
}

/** A paragraph-shaped stack of skeleton lines. */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={cn(
            'skeleton h-4 rounded-sm',
            index === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full',
          )}
        />
      ))}
    </div>
  );
}
