import { Card, Skeleton } from '@/components/ui';

/** Shaped like a hero card and a leg timeline. */
export function TravelSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only" role="status">
        Henter reisen
      </span>
      <Card padding="lg">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-64 max-w-full" />
        <Skeleton className="mt-3 h-5 w-72 max-w-full" />
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
      </Card>
      <Card padding="none" className="px-3 py-4">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="grid grid-cols-[3.5rem_1.5rem_minmax(0,1fr)] gap-x-2 py-2">
            <Skeleton className="ml-auto h-4 w-10" />
            <Skeleton className="mx-auto size-3 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className={row % 2 ? 'h-4 w-32' : 'h-4 w-44'} />
              {row % 2 ? null : <Skeleton className="h-3 w-24" />}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
