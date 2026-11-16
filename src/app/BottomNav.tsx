import { motion } from 'motion/react';
import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';
import { activeBottomPath, BOTTOM_NAV, type NavDestination } from './navigation';
import { useNavBadges } from './useNavBadges';

/**
 * Mobile bottom navigation: five destinations, docked, with the home-indicator
 * inset below it. A soft pill behind the active icon slides between items.
 */
export function BottomNav() {
  const { pathname } = useLocation();
  const badges = useNavBadges();
  const activePath = activeBottomPath(pathname);

  const activeIndex = BOTTOM_NAV.findIndex((item) => item.path === activePath);

  return (
    <nav
      aria-label="Hovedmeny"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pr-(--safe-right) pb-(--safe-bottom) pl-(--safe-left)"
    >
      <div className="relative mx-auto h-(--nav-height) max-w-[560px]">
        {/*
          The soft pill behind the active icon. One element that slides by whole
          columns (x = index × its own width) on a spring, so it can be interrupted
          mid-flight. Deliberately not a shared-layout (`layoutId`) animation: those
          measure in page space, and a navigation that also resets the scroll
          position made the pill fly in from wherever the old page was scrolled to.
        */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: `${activeIndex * 100}%` }}
          transition={spring.indicator}
          className="pointer-events-none absolute inset-y-0 left-0 w-1/5"
        >
          <span className="absolute inset-x-0 top-1.5 mx-auto h-8 w-14 rounded-full bg-primary-soft" />
        </motion.span>
        <ul className="relative grid h-full grid-cols-5">
          {BOTTOM_NAV.map((item) => (
            <li key={item.path} className="min-w-0">
              <BottomNavItem
                item={item}
                active={item.path === activePath}
                exact={item.path === pathname}
                badge={badges[item.path]}
              />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function BottomNavItem({
  item,
  active,
  exact,
  badge,
}: {
  item: NavDestination;
  active: boolean;
  /** Already on the tab's root page (not a sub-page). */
  exact: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  const hasBadge = badge !== undefined && badge > 0;

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // Tapping the tab you are on scrolls to the top, like a native tab bar.
    if (exact) {
      event.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  return (
    <Link
      to={item.path}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={hasBadge ? `${item.label}, ${badge} nye` : undefined}
      draggable={false}
      className="group relative flex h-full flex-col items-center justify-center select-none [-webkit-touch-callout:none] focus-visible:-outline-offset-4"
    >
      <span className="relative flex flex-col items-center gap-1 transition-[scale] duration-150 ease-out group-active:scale-[0.94]">
        <span className="relative grid h-8 w-14 place-items-center">
          <Icon
            aria-hidden
            strokeWidth={active ? 2.25 : 2}
            className={cn(
              'size-6 transition-colors duration-150',
              active ? 'text-primary-soft-ink' : 'text-ink-2',
            )}
          />
          {hasBadge ? (
            <span
              aria-hidden
              className="nums absolute top-0 right-2 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-caption leading-none font-bold text-accent-ink ring-2 ring-surface"
            >
              {badge > 9 ? '9+' : badge}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            'text-caption leading-4 transition-colors duration-150',
            active ? 'font-semibold text-ink' : 'font-medium text-ink-2',
          )}
        >
          {item.label}
        </span>
      </span>
    </Link>
  );
}
