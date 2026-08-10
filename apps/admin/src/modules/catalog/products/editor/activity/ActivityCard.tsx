import { useMemo } from 'react';
import { History } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Alert, EmptyState, Text } from '@nexgen/ui';
import { useProductActivity } from './activityQueries.js';
import { humanizeAuditAction } from './activityFormat.js';

export interface ActivityCardProps {
  productId: string | undefined;
}

/**
 * Replaces nothing from Slice 1/2.2A (Activity had no card at all before).
 * See `activityQueries.ts`'s own docblock for the real `target_id`-filter
 * gap this works around, and why "Load more" — rather than a normal
 * page-number `Pagination` control — is the honest UX for it (the total
 * count shown by the backend's own pagination `meta` counts every
 * product's activity, not just this one, so a page-number picker would be
 * actively misleading here).
 */
export function ActivityCard({ productId }: ActivityCardProps) {
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useProductActivity(productId);

  const entries = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.data).filter((log) => log.targetId === productId),
    [data, productId],
  );

  if (!productId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={<History className="size-8" aria-hidden="true" />} title="Save the product first" description="Activity appears here once this product has been created." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isError && (
          <Alert variant="danger" role="alert">
            {"Couldn't load activity for this product."}
            <Button type="button" variant="ghost" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </Alert>
        )}

        {isLoading ? (
          <Text variant="caption" className="text-text-secondary">
            Loading…
          </Text>
        ) : entries.length === 0 ? (
          <EmptyState icon={<History className="size-8" aria-hidden="true" />} title="No activity yet" description="Changes to this product, its variants, images, and organization will appear here." />
        ) : (
          <ol className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li key={entry.id} className="border-l-2 border-border pl-3">
                <Text variant="body-strong">{humanizeAuditAction(entry.action)}</Text>
                <Text variant="caption" className="text-text-secondary">
                  {new Date(entry.createdAt).toLocaleString()}
                  {entry.actorId && <> · by {entry.actorId.slice(0, 8)}</>}
                </Text>
              </li>
            ))}
          </ol>
        )}

        {hasNextPage && (
          <div className="flex justify-center">
            <Button type="button" variant="ghost" size="sm" onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>
              Load more
            </Button>
          </div>
        )}

        <Text variant="caption" className="text-text-secondary">
          The audit log doesn&rsquo;t identify actors by name yet (only an id) — a future
          <code className="text-code"> Identity &amp; Access</code> lookup would resolve that, not invented here.
        </Text>
      </CardContent>
    </Card>
  );
}
