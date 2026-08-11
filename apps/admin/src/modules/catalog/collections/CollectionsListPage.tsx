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
import { createCollection, type CollectionDTO } from '@nexgen/api-client';
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
import { useCollections, useArchiveCollection, useDestroyCollection, useRestoreCollection } from './queries.js';
import { CollectionFormDialog } from './CollectionFormDialog.js';

type StatusFilter = 'all' | 'active' | 'archived';

/** `CollectionController::index` (apps/backend) supports `status` server-side, no `search` — filtered client-side, see BrandsListPage's own note. */
export function CollectionsListPage() {
  const { can } = useAuth();
  const canManage = can('catalog.collections.manage');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionDTO | undefined>(undefined);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'archive' | 'restore' | 'delete' | null>(null);
  /**
   * `CollectionController::index` calls `$query->paginate()` (Laravel's
   * default 15-per-page) but nothing here ever read `meta`/passed `page`,
   * so a catalog beyond 15 collections had no way to be reached from this
   * screen. Found in a Product Owner acceptance audit at 100k+-record
   * scale (2026-08-11) — pure missing wiring to the framework's existing
   * `pagination` support, not a new feature.
   */
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [status]);

  const { data, status: queryStatus, refetch } = useCollections({ status: status === 'all' ? undefined : status, page });
  const allCollections = useMemo(() => data?.data ?? [], [data]);
  const collections = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allCollections;
    return allCollections.filter((c) => c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term));
  }, [allCollections, search]);

  const archiveMutation = useArchiveCollection();
  const destroyMutation = useDestroyCollection();
  const restoreMutation = useRestoreCollection();

  const bulk = useBulkOperation<CollectionDTO>();

  function runBulk(action: 'archive' | 'restore' | 'delete'): void {
    const items: BulkItem<CollectionDTO>[] = collections
      .filter((c) => selectedIds.has(c.id))
      .map((c) => ({ id: c.id, label: c.name, data: c }));
    setBulkAction(action);
    setBulkDialogOpen(true);
    const operation = async (item: BulkItem<CollectionDTO>): Promise<void> => {
      if (action === 'archive') await archiveMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
      else if (action === 'restore') await restoreMutation.mutateAsync(item.id);
      else if (action === 'delete') await destroyMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
    };
    void bulk.run(items, operation).then(() => {
      setSelectedIds(new Set());
      void refetch();
    });
  }

  const columns: DataTableColumn<CollectionDTO>[] = useMemo(
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
          <RequirePermission anyOf={['catalog.collections.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={() => {
                    setEditingCollection(row);
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
                  title="Delete this collection?"
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
          title: 'Collections',
          description: 'Curated, position-ordered groupings of products.',
          actions: (
            <RequirePermission anyOf={['catalog.collections.manage']} inline={null}>
              <Button
                onClick={() => {
                  setEditingCollection(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> New collection
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
                  rows={collections.map((c) => ({ name: c.name, slug: c.slug, status: c.status, description: c.description ?? '' }))}
                  columns={[
                    { key: 'name', header: 'Name' },
                    { key: 'slug', header: 'Slug' },
                    { key: 'status', header: 'Status' },
                    { key: 'description', header: 'Description' },
                  ]}
                  filename="collections"
                />
                <RequirePermission anyOf={['catalog.collections.manage']} inline={null}>
                  <ImportDialog
                    trigger={<Button variant="outline" size="sm">Import CSV</Button>}
                    title="Import collections"
                    description="CSV columns: name (required), slug, description."
                    onImport={async (rows) => {
                      const result = await runCsvImport(
                        rows,
                        (row) => {
                          if (!row.name) throw new Error('Missing required field: name');
                          return { name: row.name, slug: row.slug || undefined, description: row.description || undefined };
                        },
                        (input) => createCollection(apiClient, input),
                      );
                      void refetch();
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
                    title: `Delete ${selectedIds.size} selected ${selectedIds.size === 1 ? 'collection' : 'collections'}?`,
                    description:
                      "Collections still assigned to a product can't be deleted — those will fail and stay, with the reason shown per item. Unassign a collection from its products (or archive it instead) before deleting it. This cannot be undone for the ones that do delete.",
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
          data={collections}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ title: 'No collections yet', description: 'Create your first collection to get started.' }}
          selectedIds={canManage ? selectedIds : undefined}
          onSelectionChange={canManage ? setSelectedIds : undefined}
        />
      </CrudPageLayout>

      <CollectionFormDialog open={formOpen} onOpenChange={setFormOpen} collection={editingCollection} />

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
