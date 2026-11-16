import {
  CalendarDays,
  Ellipsis,
  HardHat,
  House,
  Images,
  Lightbulb,
  MessageCircle,
  Route,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavDestination {
  /** Base path of the destination (docs/contracts.md §6). */
  path: string;
  label: string;
  icon: LucideIcon;
  /** One line for the "Mer" page. */
  description?: string;
}

const HOME: NavDestination = { path: '/', label: 'Hjem', icon: House };
const TIMETABLE: NavDestination = { path: '/timeplan', label: 'Timeplan', icon: CalendarDays };
const TRAVEL: NavDestination = { path: '/reise', label: 'Reise', icon: Route };
const MESSAGES: NavDestination = { path: '/meldinger', label: 'Meldinger', icon: MessageCircle };
const INFO: NavDestination = {
  path: '/info',
  label: 'Info-hjørnet',
  icon: Lightbulb,
  description: 'Spør om læretid, fagbrev og rettigheter',
};
const PORTFOLIO: NavDestination = {
  path: '/portefolje',
  label: 'Portefølje',
  icon: Images,
  description: 'Samle arbeidene dine og vis hva du kan',
};
const APPRENTICESHIPS: NavDestination = {
  path: '/laerlingplass',
  label: 'Lærlingplass',
  icon: HardHat,
  description: 'Finn ledige plasser og hold styr på frister',
};
const SETTINGS: NavDestination = {
  path: '/innstillinger',
  label: 'Innstillinger',
  icon: Settings,
  description: 'Profil, adresser, gangfart og utseende',
};
export const MORE: NavDestination = { path: '/mer', label: 'Mer', icon: Ellipsis };

/** The four everyday destinations: first in the sidebar, and in the bottom nav before "Mer". */
export const PRIMARY_NAV: readonly NavDestination[] = [HOME, TIMETABLE, TRAVEL, MESSAGES];
/** Sidebar group "Veien videre". */
export const FUTURE_NAV: readonly NavDestination[] = [INFO, PORTFOLIO, APPRENTICESHIPS];
export const SETTINGS_NAV: NavDestination = SETTINGS;
/** What the "Mer" page lists, in order. */
export const MORE_NAV: readonly NavDestination[] = [INFO, PORTFOLIO, APPRENTICESHIPS, SETTINGS];
/** Mobile bottom navigation. */
export const BOTTOM_NAV: readonly NavDestination[] = [...PRIMARY_NAV, MORE];

/** True when `pathname` is the destination or one of its sub-pages. */
export function isWithin(path: string, pathname: string): boolean {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** The bottom-nav item that owns `pathname`. Everything outside the four primary tabs is "Mer". */
export function activeBottomPath(pathname: string): string {
  return PRIMARY_NAV.find((item) => isWithin(item.path, pathname))?.path ?? MORE.path;
}
