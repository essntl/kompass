import { motion } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Avatar, BrandMark, DemoBadge, useAiStatus } from '@/components/ui';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';
import { useSettingsStore } from '@/stores/settings';
import {
  FUTURE_NAV,
  isWithin,
  SETTINGS_NAV,
  SIDEBAR_PRIMARY_NAV,
  type NavDestination,
} from './navigation';
import { useNavBadges } from './useNavBadges';

/** Desktop navigation (≥1024px): brand, all nine destinations, and the student's name. */
export function Sidebar() {
  const { pathname } = useLocation();
  const badges = useNavBadges();
  const profile = useSettingsStore((state) => state.profile);
  const aiStatus = useAiStatus();

  // The pill behind the active item is one element that slides to the item's
  // measured offset inside the nav. Not a shared-layout (`layoutId`) animation:
  // those measure in page space and jump when a navigation also resets scroll.
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('a[aria-current="page"]');
      setPill((previous) => {
        if (!active) return null;
        const top =
          active.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
        const next = { top: Math.round(top), height: active.offsetHeight };
        return previous && previous.top === next.top && previous.height === next.height
          ? previous
          : next;
      });
    };
    measure();
    // The settings item is pushed to the bottom, so its offset follows the window height.
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [pathname]);

  const renderItem = (item: NavDestination) => (
    <li key={item.path}>
      <SidebarItem
        item={item}
        active={isWithin(item.path, pathname)}
        badge={badges[item.path]}
      />
    </li>
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-(--sidebar-width) flex-col border-r border-line bg-bg">
      <Link
        to="/"
        className="mx-3 mt-4 mb-2 flex h-14 items-center gap-3 rounded-md px-3 focus-visible:-outline-offset-2"
      >
        <BrandMark className="size-9" />
        <span className="font-display text-title font-semibold tracking-tight text-ink">
          Kompass
        </span>
      </Link>

      <nav
        ref={navRef}
        aria-label="Hovedmeny"
        className="scroll-area relative flex flex-1 flex-col px-3 pb-3"
      >
        {/* Mounted only once measured, so it starts in place and animates from then on. */}
        {pill ? (
          <motion.span
            aria-hidden
            initial={false}
            animate={{ y: pill.top }}
            transition={spring.indicator}
            style={{ height: pill.height }}
            className="pointer-events-none absolute inset-x-3 top-0 rounded-md bg-primary-soft"
          />
        ) : null}
        <ul className="relative flex flex-col gap-0.5">{SIDEBAR_PRIMARY_NAV.map(renderItem)}</ul>
        <p
          id="sidebar-future"
          className="px-3 pt-7 pb-2 text-caption font-semibold tracking-wide text-ink-3 uppercase"
        >
          Veien videre
        </p>
        <ul aria-labelledby="sidebar-future" className="relative flex flex-col gap-0.5">
          {FUTURE_NAV.map(renderItem)}
        </ul>
        <ul className="relative mt-auto flex flex-col gap-0.5 pt-6">{renderItem(SETTINGS_NAV)}</ul>
      </nav>

      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        <Avatar name={profile.name} color={1} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-small font-semibold text-ink">{profile.name}</p>
          <p className="truncate text-caption text-ink-2">
            {profile.year} · {profile.programme}
          </p>
        </div>
      </div>
      {aiStatus === 'mock' ? (
        <div className="px-5 pb-4">
          <DemoBadge />
        </div>
      ) : null}
    </aside>
  );
}

function SidebarItem({
  item,
  active,
  badge,
}: {
  item: NavDestination;
  active: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  const hasBadge = badge !== undefined && badge > 0;
  return (
    <Link
      to={item.path}
      aria-current={active ? 'page' : undefined}
      aria-label={hasBadge ? `${item.label}, ${badge} nye` : undefined}
      className={cn(
        'group relative flex h-11 items-center gap-3 rounded-md px-3 text-body select-none',
        'transition-[color,background-color] duration-150 focus-visible:-outline-offset-2',
        active
          ? 'font-semibold text-primary-soft-ink'
          : 'font-medium text-ink-2 hover:bg-ink/5 hover:text-ink',
      )}
    >
      <Icon aria-hidden strokeWidth={active ? 2.25 : 2} className="relative size-5 shrink-0" />
      <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
      {hasBadge ? (
        <span
          aria-hidden
          className="nums relative grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-caption font-bold text-accent-ink"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}
