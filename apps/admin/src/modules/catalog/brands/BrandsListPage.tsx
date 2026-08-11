import { useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import {
  DataTable,
  type DataTableColumn,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Select,
  Text,
} from '@nexgen/ui';
import { createBrand, type BrandDTO } from '@nexgen/api-client';
import {
  CrudPageLayout,
  Toolbar,
  FilterBar,
  BulkActionsBar,
  ConfirmDialog,
  ImportDialog,
  ExportButton,
  RequirePermission,
  useBulkOperation,
  BulkOperationDialog,
  type BulkItem,
} from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { apiClient } from '../../../lib/apiClient.js';
import { catalogErrorMessage } from '../shared/errors.js';
import { runCsvImport } from '../shared/csvImport.js';
import { useBrands, useArchiveBrand, useDestroyBrand, useRestoreBrand } from './queries.js';
import { BrandFormDialog } from './BrandFormDialog.js';

type StatusFilter = 'all' | 'active' | 'archived';

export function BrandsListPage() {
  const { can } = useAuth();
  const canManage = can('catalog.brands.manage');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandDTO | undefined>(undefined);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'archive' | 'restore' | 'delete' | null>(null);
  /**
   * `BrandController::index` calls `$query->paginate()` (Laravel's default
   * 15-per-page) but nothing here ever read `meta`/passed `page`, so a
   * catalog beyond 15 brands had no way to be reached from this screen.
   * Found in a Product Owner acceptance audit at 100k+-record scale
   * (2026-08-11) — pure missing wiring to the framework's existing
   * `pagination` support, not a new feature.
   */
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [status]);

  // BrandController::index (apps/backend) supports a `status` filter only —
  // no server-side `search`. The search box below filters client-side over
  // the currently-loaded page, which is why it's labeled "Filter this
  // page…" rather than "Search…" (a real "search all brands" needs a
  // backend change this slice deliberately doesn't make — see
  // PROJECT_STATUS.md's Phase 2.2 entry).
  const { data, status: queryStatus, refetch } = useBrands({ status: status === 'all' ? undefined : status, page });
  const allBrands = useMemo(() => data?.data ?? [], [data]);
  const brands = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allBrands;
    return allBrands.filter((b) => b.name.toLowerCase().includes(term) || b.slug.toLowerCase().includes(term));
  }, [allBrands, search]);

  const archiveMutation = useArchiveBrand();
  const destroyMutation = useDestroyBrand();
  const restoreMutation = useRestoreBrand();

  const bulk = useBulkOperation<BrandDTO>();

  function runBulk(action: 'archive' | 'restore' | 'delete'): void {
    const items: BulkItem<BrandDTO>[] = brands
      .filter((b) => selectedIds.has(b.id))
      .map((b) => ({ id: b.id, label: b.name, data: b }));
    setBulkAction(action);
    setBulkDialogOpen(true);
    // `action` (this closure's own parameter) drives the operation — never
    // `bulkAction` state, which wouldn't reflect `setBulkAction` above until
    // the next render (see useBulkOperation.ts's own docblock).
    const operation = async (item: BulkItem<BrandDTO>): Promise<void> => {
      if (action === 'archive') await archiveMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
      else if (action === 'restore') await restoreMutation.mutateAsync(item.id);
      else if (action === 'delete') await destroyMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
    };
    void bulk.run(items, operation).then(() => {
      setSelectedIds(new Set());
      void refetch();
    });
  }

  const columns: DataTableColumn<BrandDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'slug', header: 'Slug', cell: (row) => row.slug },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <Badge variant={row.status === 'active' ? 'success' : 'default'}>{row.status}</Badge>,
      },
      {
        id: 'actions',
        header: '',
        className: 'w-10',
        cell: (row) => (
          <RequirePermission anyOf={['catalog.brands.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={() => {
                    setEditingBrand(row);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                {row.status === 'active' ? (
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
                  title="Delete this brand?"
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
    [archiveMutation, restoreMutation, destroyMutation],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Brands',
          description: 'Manage the brands your products belong to.',
          actions: (
            <RequirePermission anyOf={['catalog.brands.manage']} inline={null}>
              <Button
                onClick={() => {
                  setEditingBrand(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> New brand
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Filter this page…"
            filters={
              <FilterBar
                active={status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status }]}
                onRemove={() => setStatus('all')}
              >
                <Select
                  label="Status"
                  value={status}
                  onValueChange={(v) => setStatus(v as StatusFilter)}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                />
              </FilterBar>
            }
            actions={
              <>
                <ExportButton
                  rows={brands.map((b) => ({ name: b.name, slug: b.slug, status: b.status, description: b.description ?? '' }))}
                  columns={[
                    { key: 'name', header: 'Name' },
                    { key: 'slug', header: 'Slug' },
                    { key: 'status', header: 'Status' },
                    { key: 'description', header: 'Description' },
                  ]}
                  filename="brands"
                />
                <RequirePermission anyOf={['catalog.brands.manage']} inline={null}>
                  <ImportDialog
                    trigger={<Button variant="outline" size="sm">Import CSV</Button>}
                    title="Import brands"
                    description="CSV columns: name (required), slug, description, metaTitle, metaDescription."
                    onImport={async (rows) => {
                      const result = await runCsvImport(
                        rows,
                        (row) => {
                          if (!row.name) throw new Error('Missing required field: name');
                          return {
                            name: row.name,
                            slug: row.slug || undefined,
                            description: row.description || undefined,
                            metaTitle: row.metaTitle || undefined,
                            metaDescription: row.metaDescription || undefined,
                          };
                        },
                        (input) => createBrand(apiClient, input),
                      );
                      void refetch(); // once, after the whole batch — not per row
                      return result;
                    }}
                  />
                </RequirePermission>
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
                { label: 'Archive', onClick: () => runBulk('archive') },
                { label: 'Restore', onClick: () => runBulk('restore') },
                {
                  label: 'Delete',
                  variant: 'destructive',
                  onClick: () => runBulk('delete'),
                  confirm: {
                    title: `Delete ${selectedIds.size} selected ${selectedIds.size === 1 ? 'brand' : 'brands'}?`,
                    description:
                      "Brands still assigned to a product can't be deleted — those will fail and stay, with the reason shown per item. Clear the brand from its products (or archive it instead) before deleting it. This cannot be undone for the ones that do delete.",
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
          data={brands}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ title: 'No brands yet', description: 'Create your first brand to get started.' }}
          selectedIds={canManage ? selectedIds : undefined}
          onSelectionChange={canManage ? setSelectedIds : undefined}
        />
      </CrudPageLayout>

      <BrandFormDialog open={formOpen} onOpenChange={setFormOpen} brand={editingBrand} />

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
