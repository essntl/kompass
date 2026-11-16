import type { RouteObject } from 'react-router';

export const routes: RouteObject[] = [
  {
    path: 'portefolje',
    lazy: async () => ({ Component: (await import('./PortfolioPage')).PortfolioPage }),
  },
  {
    path: 'portefolje/:entryId',
    lazy: async () => ({ Component: (await import('./EntryPage')).EntryPage }),
  },
];
