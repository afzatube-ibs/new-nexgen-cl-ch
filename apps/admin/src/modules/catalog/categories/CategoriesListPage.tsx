import { useMemo, useState } from 'react';
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
import { createCategory, type CategoryDTO } from '@nexgen/api-client';
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
import { runCsvImport } from '../shared/csvImport.js';
import { useCategories, useArchiveCategory, useDestroyCategory, useRestoreCategory } from './queries.js';
import { CategoryFormDialog } from './CategoryFormDialog.js';

type StatusFilter = 'all' | 'active' | 'archived';

/** `CategoryController::index` (apps/backend) supports `status`/`parent_id` server-side, no `search` — the search box filters client-side over the current page (see BrandsListPage's own note). */
export function CategoriesListPage() {
  const { can } = useAuth();
  const canManage = can('catalog.categories.manage');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | undefined>(undefined);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'archive' | 'restore' | 'delete' | null>(null);

  const { data, status: queryStatus, refetch } = useCategories({ status: status === 'all' ? undefined : status });
  const allCategories = useMemo(() => data?.data ?? [], [data]);
  const categoriesById = useMemo(() => new Map(allCategories.map((c) => [c.id, c])), [allCategories]);
  const categories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allCategories;
    return allCategories.filter((c) => c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term));
  }, [allCategories, search]);

  const archiveMutation = useArchiveCategory();
  const destroyMutation = useDestroyCategory();
  const restoreMutation = useRestoreCategory();

  const bulk = useBulkOperation<CategoryDTO>();

  function runBulk(action: 'archive' | 'restore' | 'delete'): void {
    const items: BulkItem<CategoryDTO>[] = categories
      .filter((c) => selectedIds.has(c.id))
      .map((c) => ({ id: c.id, label: c.name, data: c }));
    setBulkAction(action);
    setBulkDialogOpen(true);
    const operation = async (item: BulkItem<CategoryDTO>): Promise<void> => {
      if (action === 'archive') await archiveMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
      else if (action === 'restore') await restoreMutation.mutateAsync(item.id);
      else if (action === 'delete') await destroyMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
    };
    void bulk.run(items, operation).then(() => {
      setSelectedIds(new Set());
      void refetch();
    });
  }

  const columns: DataTableColumn<CategoryDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'slug', header: 'Slug', cell: (row) => row.slug },
      { id: 'parent', header: 'Parent', cell: (row) => (row.parentId ? (categoriesById.get(row.parentId)?.name ?? '—') : '—') },
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
          <RequirePermission anyOf={['catalog.categories.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={() => {
                    setEditingCategory(row);
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
                  title="Delete this category?"
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
    [archiveMutation, restoreMutation, destroyMutation, categoriesById],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Categories',
          description: 'Organize products into a category tree.',
          actions: (
            <RequirePermission anyOf={['catalog.categories.manage']} inline={null}>
              <Button
                onClick={() => {
                  setEditingCategory(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> New category
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
                  rows={categories.map((c) => ({ name: c.name, slug: c.slug, status: c.status, description: c.description ?? '' }))}
                  columns={[
                    { key: 'name', header: 'Name' },
                    { key: 'slug', header: 'Slug' },
                    { key: 'status', header: 'Status' },
                    { key: 'description', header: 'Description' },
                  ]}
                  filename="categories"
                />
                <RequirePermission anyOf={['catalog.categories.manage']} inline={null}>
                  <ImportDialog
                    trigger={<Button variant="outline" size="sm">Import CSV</Button>}
                    title="Import categories"
                    description="CSV columns: name (required), slug, description, metaTitle, metaDescription. Parent assignment isn't supported via import — edit the category afterward."
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
                        (input) => createCategory(apiClient, input),
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
                { label: 'Delete', variant: 'destructive', onClick: () => runBulk('delete') },
              ]}
            />
          ) : undefined
        }
      >
        <DataTable
          columns={columns}
          data={categories}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ title: 'No categories yet', description: 'Create your first category to get started.' }}
          selectedIds={canManage ? selectedIds : undefined}
          onSelectionChange={canManage ? setSelectedIds : undefined}
        />
      </CrudPageLayout>

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editingCategory} />

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
