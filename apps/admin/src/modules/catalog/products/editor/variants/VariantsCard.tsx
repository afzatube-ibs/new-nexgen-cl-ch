import { useMemo, useState } from 'react';
import { Plus, Trash2, Archive, Pencil, Check, X, Layers } from 'lucide-react';
import type { ProductDTO, OptionValueDTO } from '@nexgen/api-client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Checkbox,
  Input,
  Badge,
  Alert,
  EmptyState,
  Text,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@nexgen/ui';
import { ConfirmDialog } from '../../../../../framework/index.js';
import { catalogErrorMessage } from '../../../shared/errors.js';
import { useOptions } from '../../../options/queries.js';
import {
  useProductVariants,
  useSyncProductVariantOptions,
  useAddProductVariant,
  useUpdateProductVariant,
  useArchiveProductVariant,
  useDestroyProductVariant,
} from './variantQueries.js';
import { combinations, combinationKey } from './variantCombinations.js';

export interface VariantsCardProps {
  product: ProductDTO;
  canManage: boolean;
}

/**
 * Replaces nothing from Slice 1/2.2A directly (Variants had no card at
 * all before — the completion checklist only listed it as "not available
 * yet"). Only rendered meaningfully for `configurable` products, matching
 * `PublishProductAction`'s own real completeness rule.
 */
export function VariantsCard({ product, canManage }: VariantsCardProps) {
  const { data: optionsData } = useOptions();
  const allOptions = optionsData?.data ?? [];

  const { data: variantsData, isLoading, isError, refetch } = useProductVariants(product.id);
  const variants = useMemo(() => variantsData?.data ?? [], [variantsData]);

  // `ProductResource` (apps/backend) has no `options` field — only each
  // variant's own `optionValues`. "Currently assigned options" is
  // therefore inferred, best-effort, from the option values existing
  // variants actually use. An option selected here but not yet used by any
  // variant will not survive a page reload — a real, named backend gap
  // (the fix would be `'options' => OptionResource::collection(...)` on
  // `ProductResource`), not a frontend oversight.
  const inferredOptionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const variant of variants) {
      for (const ov of variant.optionValues) ids.add(ov.optionId);
    }
    return ids;
  }, [variants]);

  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(inferredOptionIds);
  const [optionsDirty, setOptionsDirty] = useState(false);

  const syncOptions = useSyncProductVariantOptions(product.id);
  const addVariant = useAddProductVariant(product.id);
  const updateVariant = useUpdateProductVariant(product.id);
  const archiveVariant = useArchiveProductVariant(product.id);
  const deleteVariant = useDestroyProductVariant(product.id);

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editBarcode, setEditBarcode] = useState('');

  const effectiveSelectedIds = optionsDirty ? selectedOptionIds : inferredOptionIds;
  const selectedOptions = allOptions.filter((o) => effectiveSelectedIds.has(o.id));
  const existingCombos = new Set(variants.map((v) => combinationKey(v.optionValues)));
  const valueLists = selectedOptions.map((o) => o.values ?? []);
  const allCombos: OptionValueDTO[][] = selectedOptions.length > 0 && valueLists.every((l) => l.length > 0) ? combinations(valueLists) : [];
  const missingCombos = allCombos.filter((combo) => !existingCombos.has(combinationKey(combo)));

  const mutationError = syncOptions.error ?? addVariant.error ?? updateVariant.error ?? archiveVariant.error ?? deleteVariant.error;

  async function handleSaveOptions(): Promise<void> {
    // Deliberately does NOT reset `optionsDirty` back to `false` on
    // success — a real bug found via this card's own e2e test: doing so
    // made `effectiveSelectedIds` fall back to `inferredOptionIds`
    // immediately after saving, which is empty until a variant actually
    // exists, silently un-selecting every option the operator just picked
    // before they'd had a chance to generate anything from it. Once
    // touched, the local selection stays authoritative for the rest of
    // this page's lifetime; only a fresh mount (e.g. a reload) re-derives
    // from variants, per the documented `ProductResource` gap above.
    await syncOptions.mutateAsync([...effectiveSelectedIds]);
  }

  async function handleGenerateVariant(combo: OptionValueDTO[]): Promise<void> {
    const suggestedSku = `${product.sku}-${combo.map((v) => v.slug).join('-')}`.toUpperCase();
    await addVariant.mutateAsync({ sku: suggestedSku, optionValueIds: combo.map((v) => v.id) });
  }

  async function handleGenerateAll(): Promise<void> {
    for (const combo of missingCombos) {
      // SKUs must be created sequentially so each uniqueness check runs against the real, just-committed state, not a stale snapshot.
      await handleGenerateVariant(combo);
    }
  }

  function startEdit(variantId: string, sku: string, barcode: string | null): void {
    setEditingVariantId(variantId);
    setEditSku(sku);
    setEditBarcode(barcode ?? '');
  }

  async function saveEdit(variantId: string, expectedVersion: number): Promise<void> {
    await updateVariant.mutateAsync({ variantId, input: { sku: editSku, barcode: editBarcode || null, expectedVersion } });
    setEditingVariantId(null);
  }

  if (product.productType !== 'configurable') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Layers className="size-8" aria-hidden="true" />}
            title="Variants apply to configurable products only"
            description={`This product is "${product.productType}". Change its type on the General tab to manage variants.`}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variants</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {mutationError && (
          <Alert variant="danger" role="alert">
            {catalogErrorMessage(mutationError)}
          </Alert>
        )}
        {isError && (
          <Alert variant="danger" role="alert">
            {"Couldn't load this product's variants."}
            <Button type="button" variant="ghost" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </Alert>
        )}

        <div>
          <Text variant="body-strong" className="mb-2">
            Options used by this product
          </Text>
          {allOptions.length === 0 ? (
            <Text variant="caption" className="text-text-secondary">
              No options exist yet — create some under Catalog → Options first.
            </Text>
          ) : (
            <div className="flex flex-wrap gap-4 rounded-md border border-border p-3">
              {allOptions.map((option) => (
                <Checkbox
                  key={option.id}
                  label={option.name}
                  disabled={!canManage}
                  checked={effectiveSelectedIds.has(option.id)}
                  onCheckedChange={(checked) => {
                    const next = new Set(effectiveSelectedIds);
                    if (checked) next.add(option.id);
                    else next.delete(option.id);
                    setSelectedOptionIds(next);
                    setOptionsDirty(true);
                  }}
                />
              ))}
            </div>
          )}
          {canManage && (
            <div className="mt-2 flex justify-end">
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleSaveOptions()} loading={syncOptions.isPending}>
                Save options
              </Button>
            </div>
          )}
        </div>

        {selectedOptions.length > 0 && missingCombos.length > 0 && canManage && (
          <Alert variant="info">
            <div className="flex items-center justify-between gap-4">
              <span>
                {missingCombos.length} possible variant{missingCombos.length === 1 ? '' : 's'} not created yet.
              </span>
              <Button type="button" size="sm" onClick={() => void handleGenerateAll()} loading={addVariant.isPending}>
                Generate all
              </Button>
            </div>
          </Alert>
        )}

        <div>
          <Text variant="body-strong" className="mb-2">
            Variants ({variants.length})
          </Text>
          {isLoading ? (
            <Text variant="caption" className="text-text-secondary">
              Loading…
            </Text>
          ) : variants.length === 0 ? (
            <EmptyState title="No variants yet" description="Select options above, then generate variants from their combinations." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Options</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {variant.optionValues.map((v) => (
                          <Badge key={v.id} variant="outline">
                            {v.value}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingVariantId === variant.id ? (
                        <Input value={editSku} onChange={(e) => setEditSku(e.target.value)} className="w-40" aria-label="SKU" />
                      ) : (
                        <span className="font-mono text-caption">{variant.sku}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingVariantId === variant.id ? (
                        <Input value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} className="w-32" aria-label="Barcode" />
                      ) : (
                        (variant.barcode ?? '—')
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant.status === 'active' ? 'success' : 'default'}>{variant.status}</Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {editingVariantId === variant.id ? (
                            <>
                              <Button type="button" variant="ghost" size="sm" onClick={() => void saveEdit(variant.id, variant.version)} aria-label="Save">
                                <Check className="size-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingVariantId(null)} aria-label="Cancel">
                                <X className="size-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(variant.id, variant.sku, variant.barcode)}
                                aria-label={`Edit ${variant.sku}`}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              {variant.status === 'active' && (
                                <ConfirmDialog
                                  trigger={
                                    <Button type="button" variant="ghost" size="sm" aria-label={`Archive ${variant.sku}`}>
                                      <Archive className="size-4" />
                                    </Button>
                                  }
                                  title="Archive variant?"
                                  description={`"${variant.sku}" will no longer be sellable.`}
                                  confirmLabel="Archive"
                                  onConfirm={async () => {
                                    await archiveVariant.mutateAsync({ variantId: variant.id, expectedVersion: variant.version });
                                  }}
                                />
                              )}
                              <ConfirmDialog
                                trigger={
                                  <Button type="button" variant="ghost" size="sm" aria-label={`Delete ${variant.sku}`}>
                                    <Trash2 className="size-4 text-feedback-danger" />
                                  </Button>
                                }
                                title="Delete variant?"
                                description={`"${variant.sku}" will be permanently removed.`}
                                confirmLabel="Delete"
                                destructive
                                onConfirm={() => deleteVariant.mutateAsync({ variantId: variant.id, expectedVersion: variant.version })}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {canManage && missingCombos.length > 0 && missingCombos.length <= 20 && (
          <div>
            <Text variant="body-strong" className="mb-2">
              Add one at a time
            </Text>
            <div className="flex flex-wrap gap-2">
              {missingCombos.map((combo) => (
                <Button key={combinationKey(combo)} type="button" variant="outline" size="sm" onClick={() => void handleGenerateVariant(combo)}>
                  <Plus className="size-3.5" />
                  {combo.map((v) => v.value).join(' / ')}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Text variant="caption" className="text-text-secondary">
          Price, cost, stock, and per-variant images aren&rsquo;t columns on this model yet — they belong to the future
          Pricing/Inventory modules and the Media Manager above (product-level only for now), not Catalog.
        </Text>
      </CardContent>
    </Card>
  );
}
