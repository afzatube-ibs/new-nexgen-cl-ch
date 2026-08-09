import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Pencil, UploadCloud, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, Text, Tooltip, TooltipTrigger, TooltipContent } from '@nexgen/ui';
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
import { useBrands } from '../brands/queries.js';
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

  const { data: brandsData } = useBrands(undefined);
  const brandOptions = useMemo(
    () => [{ value: 'all', label: 'All brands' }, ...(brandsData?.data ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [brandsData],
  );
  const brandNameById = useMemo(() => new Map((brandsData?.data ?? []).map((b) => [b.id, b.name])), [brandsData]);

  const { data, status: queryStatus, refetch } = useProducts({
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    visibility: visibility === 'all' ? undefined : visibility,
    brandId: brandId === 'all' ? undefined : brandId,
  });
  const products = data?.data ?? [];

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
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'sku', header: 'SKU', cell: (row) => row.sku },
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
          description: 'General details and SEO — variants, media, and organization land in a follow-up phase.',
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
                { label: 'Delete', variant: 'destructive', onClick: () => runBulk('delete') },
              ]}
            />
          ) : undefined
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
