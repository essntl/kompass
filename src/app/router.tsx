import { createBrowserRouter, type RouteObject } from 'react-router';
import { routes as apprenticeshipRoutes } from '@/features/apprenticeships/routes';
import { routes as dashboardRoutes } from '@/features/dashboard/routes';
import { routes as infoRoutes } from '@/features/info/routes';
import { routes as messageRoutes } from '@/features/messages/routes';
import { routes as portfolioRoutes } from '@/features/portfolio/routes';
import { routes as settingsRoutes } from '@/features/settings/routes';
import { routes as timetableRoutes } from '@/features/timetable/routes';
import { routes as travelRoutes } from '@/features/travel/routes';
import { AppShell } from './AppShell';
import { AppSplash } from './AppSplash';
import { MorePage } from './MorePage';
import { NotFoundPage } from './NotFoundPage';
import { RootErrorBoundary, RouteErrorBoundary } from './RootErrorBoundary';

/*
 * Each feature exports `routes: RouteObject[]` from `src/features/<name>/routes.tsx`.
 * They are mounted as children of the shell, so paths may be written relative
 * ("timeplan", "meldinger/:threadId") or absolute ("/timeplan"); the dashboard
 * uses `{ index: true }`. Use `lazy` for pages:
 *
 *   {
 *     path: 'timeplan',
 *     lazy: async () => ({ Component: (await import('./TimetablePage')).TimetablePage }),
 *   }
 */
const featureRoutes: RouteObject[] = [
  ...dashboardRoutes,
  ...timetableRoutes,
  ...travelRoutes,
  ...messageRoutes,
  ...infoRoutes,
  ...portfolioRoutes,
  ...apprenticeshipRoutes,
  ...settingsRoutes,
];

/** Component gallery, only in development: /dev/ui */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'dev/ui',
        lazy: async () => ({ Component: (await import('./dev/UiGallery')).UiGallery }),
      },
    ]
  : [];

export const router = createBrowserRouter([
  {
    id: 'shell',
    Component: AppShell,
    // The shell itself failed: full-screen message without navigation.
    ErrorBoundary: RootErrorBoundary,
    HydrateFallback: AppSplash,
    children: [
      {
        // A page failed: the message replaces the page, the navigation stays.
        ErrorBoundary: RouteErrorBoundary,
        children: [
          ...featureRoutes,
          { path: 'mer', Component: MorePage },
          ...devRoutes,
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
]);
