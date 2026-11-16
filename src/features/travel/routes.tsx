import type { RouteObject } from 'react-router';

export const routes: RouteObject[] = [
  {
    path: 'reise',
    lazy: async () => ({ Component: (await import('./TravelPage')).TravelPage }),
  },
];
