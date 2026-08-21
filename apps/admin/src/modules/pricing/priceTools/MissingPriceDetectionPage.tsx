import { useEffect, useMemo, useState } from 'react';
import { Plus, PackageSearch } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, Select, Text, Card, Pagination } from '@nexgen/ui';
import { PRODUCT_STATUSES, type ProductDTO, type ProductStatus } from '@nexgen/api-client';
import { PageHeader, Toolbar, FilterBar, RequirePermission } from '../../../framework/index.js';
import { useAllPriceLists, usePriceList } from '../priceLists/queries.js';
import { PriceListEntryFormDialog } from '../priceLists/PriceListEntryFormDialog.js';
import { usePricingProductSearch } from './queries.js';

type StatusFilter = 'all' | ProductStatus;

/**
 * Missing Price Detection — `pricing.price_lists.view` (`catalog.products.
 * view` is implied by using the same real `GET /products` search every
 * merchant already sees on the Products list). Cross-references a bounded,
 * *searched* page of real Catalog products against one chosen Price List's
 * own entries (`usePriceList` — the identical hook Slice 1's own detail
 * drawer uses) to answer "which of these products have no price here."
 *
 * Deliberately never claims a whole-catalog "N products missing a price"
 * count — `ProductController::index` (apps/backend) is always Laravel's
 * default 15-per-page with no `per_page` override, so a full-catalog fetch
 * at real scale (thousands of products) would mean hundreds of sequential
 * requests. This screen instead answers the question honestly for whatever
 * slice of the catalog the merchant is searching, exactly like every other
 * Products-scale screen in this codebase already does.
 */
export function MissingPriceDetectionPage() {
  const { data: allPriceLists } = useAllPriceLists();
  const activeLists = useMemo(() => (allPriceLists ?? []).filter((l) => l.status === 'active'), [allPriceLists]);
  const [priceListId, setPriceListId] = useState<string>('');

  const { data: selectedList } = usePriceList(priceListId || undefined);
  const pricedSkus = useMemo(() => new Set((selectedList?.entries ?? []).map((e) => e.sku)), [selectedList]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [search, status, priceListId]);

  const { data, status: queryStatus, refetch } = usePricingProductSearch({
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    page,
  });
  const products = useMemo(() => data?.data ?? [], [data]);

  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [prefillSku, setPrefillSku] = useState<string | undefined>(undefined);

  function openAddPrice(sku: string): void {
    setPrefillSku(sku);
    setEntryFormOpen(true);
  }

  const missingCount = products.filter((p) => !pricedSkus.has(p.sku)).length;

  const columns: DataTableColumn<ProductDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'sku', header: 'SKU', cell: (row) => <span className="tabular-nums">{row.sku}</span> },
      { id: 'status', header: 'Status', cell: (row) => <Badge variant="outline">{row.status}</Badge> },
      {
        id: 'priced',
        header: `Priced in ${selectedList?.currencyCode ?? '—'}`,
        cell: (row) =>
          pricedSkus.has(row.sku) ? (
            <Badge className="bg-feedback-success text-black">Priced</Badge>
          ) : (
            <Badge className="bg-feedback-warning text-black">Missing</Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        className: 'w-32',
        cell: (row) =>
          !pricedSkus.has(row.sku) ? (
            <RequirePermission anyOf={['pricing.price_lists.manage']} inline={null}>
              <Button variant="outline" size="sm" onClick={() => openAddPrice(row.sku)}>
                <Plus className="size-4" /> Add price
              </Button>
            </RequirePermission>
          ) : null,
      },
    ],
    [pricedSkus, selectedList?.currencyCode],
  );

  return (
    <div>
      <PageHeader
        title="Missing Price Detection"
        description="Check whether products in the catalog have a price in a specific price list, and add one without leaving this page."
      />

      <Card className="mb-4 p-4">
        <Select
          label="Price list"
          value={priceListId}
          onValueChange={setPriceListId}
          options={[{ value: '', label: 'Select a price list…' }, ...activeLists.map((l) => ({ value: l.id, label: `${l.name} (${l.currencyCode})` }))]}
        />
      </Card>

      {!priceListId ? (
        <Card className="p-8 text-center">
          <Text variant="body" className="text-text-secondary">
            Select a price list above to check which products have no price in it.
          </Text>
        </Card>
      ) : (
        <>
          {products.length > 0 && (
            <Text variant="caption" className="mb-2 block text-text-secondary">
              {missingCount} of {products.length} shown {missingCount === 1 ? 'is' : 'are'} missing a price in {selectedList?.name ?? 'this list'}.
            </Text>
          )}

          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name or SKU…"
            filters={
              <FilterBar
                active={status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status }]}
                onRemove={() => setStatus('all')}
              >
                <Select
                  label="Status"
                  value={status}
                  onValueChange={(v) => setStatus(v as StatusFilter)}
                  options={[{ value: 'all', label: 'All' }, ...PRODUCT_STATUSES.map((s) => ({ value: s, label: s }))]}
                />
              </FilterBar>
            }
          />

          <DataTable
            columns={columns}
            data={products}
            getRowId={(row) => row.id}
            status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
            onRetry={() => void refetch()}
            emptyState={{
              icon: <PackageSearch className="size-8" aria-hidden="true" />,
              title: 'No matching products',
              description: 'No products match the current search or filter.',
            }}
          />

          {data?.meta?.last_page && data.meta.last_page > 1 && (
            <div className="mt-4">
              <Pagination currentPage={data.meta.current_page ?? page} totalPages={data.meta.last_page} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {selectedList && (
        <PriceListEntryFormDialog
          open={entryFormOpen}
          onOpenChange={(open) => {
            setEntryFormOpen(open);
            if (!open) setPrefillSku(undefined);
          }}
          priceList={selectedList}
          initialSku={prefillSku}
        />
      )}
    </div>
  );
}
