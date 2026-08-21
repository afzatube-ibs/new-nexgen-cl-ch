import { Skeleton } from '@nexgen/ui';

/** App Router's own file convention — the route-level Suspense fallback shown while a Server Component's own data fetch is in flight. Shaped to roughly match a real page's own layout (`UI:LOADING_STATES`'s "never a generic spinner"), not a bare spinner. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          // eslint-disable-next-line react/no-array-index-key -- a loading skeleton row has no stable identity of its own (packages/config/eslint.base.js's own documented exception).
          <Skeleton key={index} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
}
