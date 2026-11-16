import type { RouteObject } from 'react-router';

export const routes: RouteObject[] = [
  {
    path: 'timeplan',
    lazy: async () => ({ Component: (await import('./TimetablePage')).TimetablePage }),
  },
];
