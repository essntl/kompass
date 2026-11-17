import type { RouteObject } from 'react-router';

export const routes: RouteObject[] = [
  {
    path: 'vurderinger',
    lazy: async () => ({ Component: (await import('./AssessmentsPage')).AssessmentsPage }),
  },
  {
    path: 'vurderinger/:assessmentId',
    lazy: async () => ({ Component: (await import('./AssessmentDetailPage')).AssessmentDetailPage }),
  },
];
