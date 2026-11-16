import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useIsDesktop } from '@/components/ui';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { cn } from '@/lib/cn';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

/**
 * The frame around every page: sidebar on desktop, bottom navigation on mobile.
 *
 * The document itself scrolls (not an inner container), so the browser's own
 * scroll physics, scroll restoration and find-in-page all work. Pages render
 * through `<Page>`, which handles gutters, safe areas and the enter transition;
 * there is deliberately no exit animation, so switching tabs is instant.
 */
export function AppShell() {
  const isDesktop = useIsDesktop();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // After a navigation, start keyboard and screen-reader users at the new page –
  // unless the page already put focus somewhere itself (an autofocused field).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const active = document.activeElement;
    const focusIsStale =
      !active || active === document.body || !mainRef.current?.contains(active);
    if (focusIsStale) mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <a href="#innhold" className={cn('skip-link', buttonClasses({ variant: 'primary' }))}>
        Hopp til innholdet
      </a>

      {isDesktop ? <Sidebar /> : null}

      <main
        id="innhold"
        ref={mainRef}
        tabIndex={-1}
        className="min-h-dvh pr-(--safe-right) pl-[calc(var(--shell-left)+var(--safe-left))] outline-none"
      >
        <Outlet />
      </main>

      {isDesktop ? null : <BottomNav />}

      <ScrollRestoration />
    </div>
  );
}
