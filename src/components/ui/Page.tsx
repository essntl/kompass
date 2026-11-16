import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';

const WIDTHS = {
  /** Reading width (720px): forms, lists, most pages. */
  narrow: 'max-w-(--content-max)',
  /** 1080px: dashboards and grids that use two columns on desktop. */
  wide: 'max-w-[1080px]',
  /** No max width (timetable week view, maps). Gutters stay. */
  full: 'max-w-none',
} as const;

export interface PageProps extends ComponentPropsWithRef<'div'> {
  width?: keyof typeof WIDTHS;
  /**
   * Makes the page exactly as tall as the visible area above the bottom nav and
   * drops the bottom padding – for layouts with their own scroll area and a
   * pinned composer (chat). The page becomes a flex column; give the scrolling
   * child `min-h-0 flex-1 scroll-area`.
   */
  fill?: boolean;
}

/**
 * Every routed page wraps its content in `<Page>`. It provides the gutters,
 * the max width, safe-area padding at the top, clearance for the bottom nav,
 * the 24px rhythm between sections and the enter transition.
 */
export function Page({ width = 'narrow', fill = false, className, children, ...rest }: PageProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full animate-page-enter flex-col px-(--gutter)',
        'pt-[calc(var(--safe-top)+16px)] desktop:pt-10',
        WIDTHS[width],
        fill
          ? 'h-[calc(100dvh-var(--shell-bottom))] gap-4'
          : 'gap-6 pb-[calc(var(--shell-bottom)+32px)] desktop:pb-16',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
