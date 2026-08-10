import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Link2 } from 'lucide-react';
import type { ProductDTO, ProductRelationshipType } from '@nexgen/api-client';
import { PRODUCT_RELATIONSHIP_TYPES } from '@nexgen/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Badge, Alert, EmptyState, Text } from '@nexgen/ui';
import { catalogErrorMessage } from '../../../shared/errors.js';
import { useProducts } from '../../queries.js';
import { useProductRelationships, useAddProductRelationship, useRemoveProductRelationship } from './organizationQueries.js';

export interface RelatedProductsCardProps {
  product: ProductDTO;
  canManage: boolean;
}

const TYPE_LABEL: Record<ProductRelationshipType, string> = {
  related: 'Related',
  cross_sell: 'Cross-sell',
  up_sell: 'Upsell',
};

/**
 * `ProductRelationship::types()` (apps/backend) is `related`/`cross_sell`/
 * `up_sell` only — no "frequently_bought_together" type exists, so that
 * specific item from the Slice 2 brief is not implemented here; a real
 * gap, named rather than faked with a fourth option that would 422 on
 * every save.
 */
export function RelatedProductsCard({ product, canManage }: RelatedProductsCardProps) {
  const { data, isLoading, isError, refetch } = useProductRelationships(product.id);
  const relationships = useMemo(() => data?.data ?? [], [data]);

  const [search, setSearch] = useState('');
  const [type, setType] = useState<ProductRelationshipType>('related');
  const { data: searchResults } = useProducts({ search, perPage: 5 }, { enabled: search.length >= 2 });

  const [nameCache, setNameCache] = useState<Map<string, { name: string; sku: string }>>(new Map());
  useEffect(() => {
    if (!searchResults) return;
    setNameCache((prev) => {
      const next = new Map(prev);
      for (const p of searchResults.data) next.set(p.id, { name: p.name, sku: p.sku });
      return next;
    });
  }, [searchResults]);

  const addMutation = useAddProductRelationship(product.id);
  const removeMutation = useRemoveProductRelationship(product.id);
  const mutationError = addMutation.error ?? removeMutation.error;

  const alreadyRelatedIds = useMemo(() => new Set(relationships.map((r) => r.relatedProductId)), [relationships]);
  const results = (searchResults?.data ?? []).filter((p) => p.id !== product.id && !alreadyRelatedIds.has(p.id));

  const grouped = PRODUCT_RELATIONSHIP_TYPES.map((t) => ({ type: t, items: relationships.filter((r) => r.type === t) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Related products</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mutationError && (
          <Alert variant="danger" role="alert">
            {catalogErrorMessage(mutationError)}
          </Alert>
        )}
        {isError && (
          <Alert variant="danger" role="alert">
            {"Couldn't load this product's relationships."}
            <Button type="button" variant="ghost" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </Alert>
        )}

        {canManage && (
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <Input label="Search" placeholder="Search products by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select
                label="Type"
                value={type}
                onValueChange={(v) => setType(v as ProductRelationshipType)}
                options={PRODUCT_RELATIONSHIP_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
              />
            </div>
            {search.length >= 2 && (
              <div className="flex flex-col gap-1">
                {results.length === 0 ? (
                  <Text variant="caption" className="text-text-secondary">
                    No matching products.
                  </Text>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex items-center justify-between gap-2 rounded-md p-1.5 text-left hover:bg-surface-secondary"
                      onClick={() => {
                        addMutation.mutate({ relatedProductId: p.id, type });
                        setSearch('');
                      }}
                    >
                      <span className="truncate text-body">
                        {p.name} <span className="font-mono text-caption text-text-secondary">{p.sku}</span>
                      </span>
                      <Plus className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <Text variant="caption" className="text-text-secondary">
            Loading…
          </Text>
        ) : relationships.length === 0 ? (
          <EmptyState icon={<Link2 className="size-8" aria-hidden="true" />} title="No related products yet" description="Search above to link products." />
        ) : (
          <div className="flex flex-col gap-3">
            {grouped
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <div key={group.type}>
                  <Text variant="caption" className="mb-1 text-text-secondary">
                    {TYPE_LABEL[group.type]}
                  </Text>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => {
                      const known = nameCache.get(item.relatedProductId);
                      return (
                        <Badge key={item.id} variant="outline" className="gap-1.5 pr-1">
                          {known ? known.name : `#${item.relatedProductId.slice(0, 8)}`}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => removeMutation.mutate(item.id)}
                              aria-label={`Remove ${known ? known.name : item.relatedProductId}`}
                              className="rounded-full p-0.5 hover:bg-surface-secondary"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}

        <Text variant="caption" className="text-text-secondary">
          {"“Frequently bought together” isn't a relationship type this backend supports yet ("}
          <code className="text-code">related</code>, <code className="text-code">cross_sell</code>, and{' '}
          <code className="text-code">up_sell</code> only) — not built here rather than faked.
        </Text>
      </CardContent>
    </Card>
  );
}
