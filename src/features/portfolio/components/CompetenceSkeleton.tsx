import { Skeleton, SkeletonText } from '@/components/ui';

/** Loading state shaped like the finished description: summary, what was done, skills, goals. */
export function CompetenceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Lager kompetansebeskrivelse" className="flex flex-col gap-5">
      <SkeletonText lines={2} />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <SkeletonText lines={3} />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-wrap gap-2">
          {['w-28', 'w-36', 'w-24', 'w-32'].map((width) => (
            <Skeleton key={width} className={`h-7 rounded-sm ${width}`} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        {[0, 1].map((key) => (
          <div key={key} className="flex flex-col gap-2 rounded-lg border border-line p-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
