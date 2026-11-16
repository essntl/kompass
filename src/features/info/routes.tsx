import type { RouteObject } from 'react-router';

/*
 * Info-hjørnet:
 *   /info                  the assistant, the education-path teaser and the eight topics
 *   /info/veier            interactive map of education paths (?steg=<node id>)
 *   /info/tema/:topicId    one topic: explainer, questions, sources, videos
 * Unknown /info/… paths fall through to the app's NotFoundPage.
 */
export const routes: RouteObject[] = [
  {
    path: 'info',
    lazy: async () => ({ Component: (await import('./InfoPage')).InfoPage }),
  },
  {
    path: 'info/veier',
    lazy: async () => ({ Component: (await import('./PathsPage')).PathsPage }),
  },
  {
    path: 'info/tema/:topicId',
    lazy: async () => ({ Component: (await import('./TopicPage')).TopicPage }),
  },
];
