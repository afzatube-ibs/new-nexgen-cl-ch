import { useState } from 'react';
import type { ProductDTO } from '@nexgen/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, Checkbox, Alert, Text } from '@nexgen/ui';
import { catalogErrorMessage } from '../../../shared/errors.js';
import { useAllCategories } from '../../../categories/queries.js';
import { useAllCollections } from '../../../collections/queries.js';
import { useAllTags } from '../../../tags/queries.js';
import { useSyncProductCategories, useSyncProductCollections, useSyncProductTags } from './organizationQueries.js';

export interface OrganizationCardProps {
  product: ProductDTO;
  canManage: boolean;
}

function idSet(items: { id: string }[] | undefined): Set<string> {
  return new Set((items ?? []).map((i) => i.id));
}

/**
 * Replaces the Slice-1/2.2A "Organization — Not available yet" placeholder.
 * `product.categories`/`collections`/`tags` come from `ProductResource`'s
 * always-eager-loaded detail response (`GET /products/{id}`) — the
 * completion checklist depends on `categories.length > 0` becoming real
 * here, not a client-invented count.
 */
export function OrganizationCard({ product, canManage }: OrganizationCardProps) {
  /**
   * `useAllCategories`/`useAllCollections`/`useAllTags` (not the plain
   * first-page hooks) — a merchant with more than 15 of any of these could
   * never even see, let alone assign, the 16th one on a product before this
   * fix. Found via a Product Owner acceptance audit of Phase 2.2
   * (2026-08-11), auditing every Product Editor selector for the same
   * pagination cap already found and fixed on the list-browsing pages.
   */
  const { data: allCategories } = useAllCategories();
  const { data: allCollections } = useAllCollections();
  const { data: allTags } = useAllTags();

  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => idSet(product.categories));
  const [selectedCollectionIds, setSelectedCollectionIds] = useState(() => idSet(product.collections));
  const [selectedTagIds, setSelectedTagIds] = useState(() => idSet(product.tags));
  const [dirty, setDirty] = useState(false);

  const syncCategories = useSyncProductCategories(product.id);
  const syncCollections = useSyncProductCollections(product.id);
  const syncTags = useSyncProductTags(product.id);
  const saving = syncCategories.isPending || syncCollections.isPending || syncTags.isPending;
  const mutationError = syncCategories.error ?? syncCollections.error ?? syncTags.error;

  const categoriesById = new Map((allCategories ?? []).map((c) => [c.id, c]));

  async function handleSave(): Promise<void> {
    await Promise.all([
      syncCategories.mutateAsync([...selectedCategoryIds]),
      syncCollections.mutateAsync([...selectedCollectionIds]),
      syncTags.mutateAsync([...selectedTagIds]),
    ]);
    setDirty(false);
  }

  function toggle(set: Set<string>, setter: (next: Set<string>) => void, id: string, checked: boolean): void {
    const next = new Set(set);
    if (checked) next.add(id);
    else next.delete(id);
    setter(next);
    setDirty(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {mutationError && (
          <Alert variant="danger" role="alert">
            {catalogErrorMessage(mutationError)}
          </Alert>
        )}

        <div>
          <Text variant="body-strong" className="mb-2">
            Categories
          </Text>
          {(allCategories?.length ?? 0) === 0 ? (
            <Text variant="caption" className="text-text-secondary">
              No categories exist yet.
            </Text>
          ) : (
            <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-3">
              {(allCategories ?? []).map((category) => (
                <Checkbox
                  key={category.id}
                  disabled={!canManage}
                  checked={selectedCategoryIds.has(category.id)}
                  onCheckedChange={(checked) => toggle(selectedCategoryIds, setSelectedCategoryIds, category.id, Boolean(checked))}
                  label={category.parentId ? `${categoriesById.get(category.parentId)?.name ?? '—'} › ${category.name}` : category.name}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <Text variant="body-strong" className="mb-2">
            Collections
          </Text>
          {(allCollections?.length ?? 0) === 0 ? (
            <Text variant="caption" className="text-text-secondary">
              No collections exist yet.
            </Text>
          ) : (
            <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-3">
              {(allCollections ?? []).map((collection) => (
                <Checkbox
                  key={collection.id}
                  disabled={!canManage}
                  checked={selectedCollectionIds.has(collection.id)}
                  onCheckedChange={(checked) => toggle(selectedCollectionIds, setSelectedCollectionIds, collection.id, Boolean(checked))}
                  label={collection.name}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <Text variant="body-strong" className="mb-2">
            Tags
          </Text>
          {(allTags?.length ?? 0) === 0 ? (
            <Text variant="caption" className="text-text-secondary">
              No tags exist yet.
            </Text>
          ) : (
            <div className="flex flex-wrap gap-4 rounded-md border border-border p-3">
              {(allTags ?? []).map((tag) => (
                <Checkbox
                  key={tag.id}
                  disabled={!canManage}
                  checked={selectedTagIds.has(tag.id)}
                  onCheckedChange={(checked) => toggle(selectedTagIds, setSelectedTagIds, tag.id, Boolean(checked))}
                  label={tag.name}
                />
              ))}
            </div>
          )}
        </div>

        {canManage && (
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => void handleSave()} loading={saving} disabled={!dirty}>
              Save organization
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
