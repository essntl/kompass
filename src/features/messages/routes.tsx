import type { RouteObject } from 'react-router';

/*
 * One page for both paths: the thread id is a child route, so on desktop the list pane
 * stays mounted (scroll position, focus) while the right pane switches conversations.
 */
export const routes: RouteObject[] = [
  {
    path: 'meldinger',
    lazy: async () => ({
      Component: (await import('./MessagesPage')).MessagesPage,
    }),
    children: [{ index: true }, { path: ':threadId' }],
  },
];
