import type { RouteObject } from 'react-router';

export const routes: RouteObject[] = [
  {
    path: 'innstillinger',
    lazy: async () => ({ Component: (await import('./SettingsPage')).SettingsPage }),
  },
];
