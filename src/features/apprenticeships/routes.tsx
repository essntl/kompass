import type { RouteObject } from 'react-router';

export const routes: RouteObject[] = [
  {
    path: 'laerlingplass',
    lazy: async () => ({ Component: (await import('./ListingsPage')).ListingsPage }),
  },
  {
    path: 'laerlingplass/:listingId',
    lazy: async () => ({ Component: (await import('./ListingDetailPage')).ListingDetailPage }),
  },
];
