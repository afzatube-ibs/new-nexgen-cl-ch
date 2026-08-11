import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Pencil, UploadCloud, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import {
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Select,
  Text,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@nexgen/ui';
import { PRODUCT_STATUSES, PRODUCT_VISIBILITIES, type ProductDTO, type ProductStatus, type ProductVisibility } from '@nexgen/api-client';
import {
  CrudPageLayout,
  Toolbar,
  FilterBar,
  BulkActionsBar,
  ConfirmDialog,
  ExportButton,
  RequirePermission,
  useBulkOperation,
  BulkOperationDialog,
  type BulkItem,
} from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { catalogErrorMessage } from '../shared/errors.js';
import { useAllBrands } from '../brands/queries.js';
import { useProducts, useArchiveProduct, useDestroyProduct, useRestoreProduct, usePublishProduct } from './queries.js';

type StatusFilter = 'all' | ProductStatus;
type VisibilityFilter = 'all' | ProductVisibility;

const STATUS_BADGE_VARIANT: Record<ProductStatus, 'default' | 'success' | 'warning'> = {
  draft: 'default',
  active: 'success',
  archived: 'warning',
};

/**
 * `ProductController::index` (apps/backend) genuinely supports server-side
 * `status`/`visibility`/`brand_id`/`search` — unlike the taxonomy entities,
 * this list's filters hit the real backend, not a client-side page filter.
 */
export function ProductsListPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canManage = can('catalog.products.manage');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [brandId, setBrandId] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'archive' | 'restore' | 'delete' | 'publish' | null>(null);
  /**
   * `ProductController::index` (apps/backend) genuinely supports server-side
   * `sort`/`direction` (`name`/`sku`/`created_at`/`published_at`) — the
   * `ListProductsQuery` type and `listProducts()` wrapper have carried these
   * fields since Slice 1, but no list page ever wired a sortable column to
   * them, leaving a merchant with no way to sort products from the UI at
   * all (always insertion order) despite the backend already supporting
   * it. Found in a Product Owner acceptance audit at 100k+-product scale
   * framing (2026-08-11). Only `name`/`sku` are marked sortable here since
   * those are the only backend-supported sort keys with an existing column
   * in this table — not adding new columns/fields, just wiring what's
   * already there end-to-end.
   */
  const [sort, setSort] = useState<DataTableSortState | null>(null);
  /**
   * `ProductController::index` (apps/backend) calls `$query->paginate()` —
   * Laravel's default 15-per-page — but nothing in this page ever read
   * `meta`/passed a `page` param, so a catalog beyond 15 products had no
   * way to be reached from this screen at all: no page 2 link, no error,
   * just a silently-truncated list. Found in a Product Owner acceptance
   * audit explicitly testing at 100k+-product scale (2026-08-11) — the
   * single most severe finding of that audit. `CrudPageLayout` already had
   * a full `pagination` prop and `ListEnvelope.meta` already carried
   * `current_page`/`last_page`; this was pure missing wiring, not a new
   * feature.
   */
  const [page, setPage] = useState(1);

  /**
   * `useAllBrands` (not `useBrands`) — this drives both the filter dropdown
   * and the table's own Brand-name lookup; the plain first-page hook used
   * to mean a product whose brand fell outside the first 15 brands showed
   * "—" in the Brand column and could never be found via the filter,
   * despite genuinely having a brand assigned. Same audit, same fix as the
   * Product Editor's own Brand selector.
   */
  const { data: allBrands } = useAllBrands();
  const brandOptions = useMemo(
    () => [{ value: 'all', label: 'All brands' }, ...(allBrands ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [allBrands],
  );
  const brandNameById = useMemo(() => new Map((allBrands ?? []).map((b) => [b.id, b.name])), [allBrands]);

  const { data, status: queryStatus, refetch } = useProducts({
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    visibility: visibility === 'all' ? undefined : visibility,
    brandId: brandId === 'all' ? undefined : brandId,
    sort: sort?.columnId,
    direction: sort?.direction,
    page,
  });
  const products = data?.data ?? [];

  // Any filter/search/sort change invalidates the current page number —
  // silently staying on, say, page 5 after a search narrows the result set
  // to 2 pages would show an empty table with no explanation.
  useEffect(() => setPage(1), [search, status, visibility, brandId, sort]);

  const archiveMutation = useArchiveProduct();
  const destroyMutation = useDestroyProduct();
  const restoreMutation = useRestoreProduct();
  const publishMutation = usePublishProduct();

  const bulk = useBulkOperation<ProductDTO>();

  function runBulk(action: 'archive' | 'restore' | 'delete' | 'publish'): void {
    const items: BulkItem<ProductDTO>[] = products
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({ id: p.id, label: `${p.name} (${p.sku})`, data: p }));
    setBulkAction(action);
    setBulkDialogOpen(true);
    const operation = async (item: BulkItem<ProductDTO>): Promise<void> => {
      if (action === 'archive') await archiveMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
      else if (action === 'restore') await restoreMutation.mutateAsync(item.id);
      else if (action === 'delete') await destroyMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
      else if (action === 'publish') await publishMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
    };
    void bulk.run(items, operation).then(() => {
      setSelectedIds(new Set());
      void refetch();
    });
  }

  const activeFilters = [
    ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status }]),
    ...(visibility === 'all' ? [] : [{ key: 'visibility', label: 'Visibility', displayValue: visibility }]),
    ...(brandId === 'all' ? [] : [{ key: 'brand', label: 'Brand', displayValue: brandNameById.get(brandId) ?? brandId }]),
  ];

  function clearFilter(key: string): void {
    if (key === 'status') setStatus('all');
    if (key === 'visibility') setVisibility('all');
    if (key === 'brand') setBrandId('all');
  }

  const columns: DataTableColumn<ProductDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text>, sortable: true },
      { id: 'sku', header: 'SKU', cell: (row) => row.sku, sortable: true },
      { id: 'type', header: 'Type', cell: (row) => <Badge variant="outline">{row.productType}</Badge> },
      { id: 'status', header: 'Status', cell: (row) => <Badge variant={STATUS_BADGE_VARIANT[row.status]}>{row.status}</Badge> },
      { id: 'brand', header: 'Brand', cell: (row) => (row.brandId ? (brandNameById.get(row.brandId) ?? '—') : '—') },
      {
        id: 'actions',
        header: '',
        className: 'w-10',
        cell: (row) => (
          <RequirePermission anyOf={['catalog.products.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={() => void navigate(`/catalog/products/${row.id}`)}>
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                {row.status === 'draft' && (
                  <DropdownMenuItem onSelect={() => void publishMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}>
                    <UploadCloud className="size-4" /> Publish
                  </DropdownMenuItem>
                )}
                {row.status !== 'archived' ? (
                  <DropdownMenuItem onSelect={() => void archiveMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}>
                    <Archive className="size-4" /> Archive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => void restoreMutation.mutateAsync(row.id)}>
                    <ArchiveRestore className="size-4" /> Restore
                  </DropdownMenuItem>
                )}
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  }
                  title="Delete this product?"
                  description={`"${row.name}" will be permanently deleted. This cannot be undone.`}
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => destroyMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}
                  getErrorMessage={catalogErrorMessage}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
        ),
      },
    ],
    [archiveMutation, restoreMutation, destroyMutation, publishMutation, brandNameById, navigate],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Products',
          description: 'Every sellable item in the catalog — general details, media, variants, and organization.',
          actions: (
            <RequirePermission anyOf={['catalog.products.manage']} inline={null}>
              <Button onClick={() => void navigate('/catalog/products/new')}>
                <Plus className="size-4" /> New product
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name or SKU…"
            filters={
              <FilterBar active={activeFilters} onRemove={clearFilter} onClearAll={() => { setStatus('all'); setVisibility('all'); setBrandId('all'); }}>
                <div className="flex flex-col gap-3">
                  <Select
                    label="Status"
                    value={status}
                    onValueChange={(v) => setStatus(v as StatusFilter)}
                    options={[{ value: 'all', label: 'All' }, ...PRODUCT_STATUSES.map((s) => ({ value: s, label: s }))]}
                  />
                  <Select
                    label="Visibility"
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as VisibilityFilter)}
                    options={[{ value: 'all', label: 'All' }, ...PRODUCT_VISIBILITIES.map((v) => ({ value: v, label: v }))]}
                  />
                  <Select label="Brand" value={brandId} onValueChange={setBrandId} options={brandOptions} />
                </div>
              </FilterBar>
            }
            actions={
              <>
                <ExportButton
                  rows={products.map((p) => ({ name: p.name, sku: p.sku, type: p.productType, status: p.status, visibility: p.visibility }))}
                  columns={[
                    { key: 'name', header: 'Name' },
                    { key: 'sku', header: 'SKU' },
                    { key: 'type', header: 'Type' },
                    { key: 'status', header: 'Status' },
                    { key: 'visibility', header: 'Visibility' },
                  ]}
                  filename="products"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="outline" size="sm" disabled>
                        Import CSV
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Coming soon — Products are relational (variants, media, categories) and need a dedicated Product Import
                    Engine, not the flat CSV import taxonomy entities use.
                  </TooltipContent>
                </Tooltip>
              </>
            }
          />
        }
        bulkActions={
          canManage ? (
            <BulkActionsBar
              selectedCount={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              actions={[
                { label: 'Publish', onClick: () => runBulk('publish') },
                { label: 'Archive', onClick: () => runBulk('archive') },
                { label: 'Restore', onClick: () => runBulk('restore') },
                {
                  label: 'Delete',
                  variant: 'destructive',
                  onClick: () => runBulk('delete'),
                  confirm: {
                    title: `Delete ${selectedIds.size} selected ${selectedIds.size === 1 ? 'product' : 'products'}?`,
                    description: 'This permanently deletes them and all their variants, media, and organization data. This cannot be undone.',
                  },
                },
              ]}
            />
          ) : undefined
        }
        pagination={
          data?.meta?.last_page
            ? { currentPage: data.meta.current_page ?? page, totalPages: data.meta.last_page, onPageChange: setPage }
            : undefined
        }
      >
        <DataTable
          columns={columns}
          data={products}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          onRowClick={(row) => void navigate(`/catalog/products/${row.id}`)}
          emptyState={{ title: 'No products yet', description: 'Create your first product to get started.' }}
          selectedIds={canManage ? selectedIds : undefined}
          onSelectionChange={canManage ? setSelectedIds : undefined}
          sort={sort}
          onSortChange={setSort}
        />
      </CrudPageLayout>

      <BulkOperationDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        title={`Bulk ${bulkAction ?? ''}`.trim()}
        state={bulk.state}
        onCancel={bulk.cancel}
        onRetryFailed={() => void bulk.retryFailed()}
      />
    </div>
  );
}
