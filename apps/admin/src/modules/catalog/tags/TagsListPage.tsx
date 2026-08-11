import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, ArchiveRestore, Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Text } from '@nexgen/ui';
import { createTag, type TagDTO } from '@nexgen/api-client';
import {
  CrudPageLayout,
  Toolbar,
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
import { useTags, useDestroyTag, useRestoreTag } from './queries.js';
import { TagFormDialog } from './TagFormDialog.js';

/** `TagController::index` (apps/backend) takes no query params at all — filtered entirely client-side, see BrandsListPage's own note. No `status` column, so no Archive action or status filter. */
export function TagsListPage() {
  const { can } = useAuth();
  const canManage = can('catalog.tags.manage');

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDTO | undefined>(undefined);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'restore' | 'delete' | null>(null);
  /**
   * `TagController::index` calls `$query->paginate()` (Laravel's default
   * 15-per-page, honored automatically via the request's `?page=` even
   * though this controller reads no other query params) but nothing here
   * ever read `meta`/passed `page`, so a catalog beyond 15 tags had no way
   * to be reached from this screen. Found in a Product Owner acceptance
   * audit at 100k+-record scale (2026-08-11) — pure missing wiring to the
   * framework's existing `pagination` support, not a new feature. No
   * page-reset-on-filter-change needed here (unlike Categories/Brands/
   * Collections) — this entity's search is entirely client-side over the
   * already-loaded page and never changes what the server returns.
   */
  const [page, setPage] = useState(1);

  const { data, status: queryStatus, refetch } = useTags({ page });
  const allTags = useMemo(() => data?.data ?? [], [data]);
  const tags = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allTags;
    return allTags.filter((t) => t.name.toLowerCase().includes(term) || t.slug.toLowerCase().includes(term));
  }, [allTags, search]);

  const destroyMutation = useDestroyTag();
  const restoreMutation = useRestoreTag();

  const bulk = useBulkOperation<TagDTO>();

  function runBulk(action: 'restore' | 'delete'): void {
    const items: BulkItem<TagDTO>[] = tags.filter((t) => selectedIds.has(t.id)).map((t) => ({ id: t.id, label: t.name, data: t }));
    setBulkAction(action);
    setBulkDialogOpen(true);
    const operation = async (item: BulkItem<TagDTO>): Promise<void> => {
      if (action === 'restore') await restoreMutation.mutateAsync(item.id);
      else if (action === 'delete') await destroyMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
    };
    void bulk.run(items, operation).then(() => {
      setSelectedIds(new Set());
      void refetch();
    });
  }

  const columns: DataTableColumn<TagDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'slug', header: 'Slug', cell: (row) => row.slug },
      {
        id: 'actions',
        header: '',
        className: 'w-10',
        cell: (row) => (
          <RequirePermission anyOf={['catalog.tags.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={() => {
                    setEditingTag(row);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void restoreMutation.mutateAsync(row.id)}>
                  <ArchiveRestore className="size-4" /> Restore
                </DropdownMenuItem>
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  }
                  title="Delete this tag?"
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
    [restoreMutation, destroyMutation],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Tags',
          description: 'Freeform labels products can carry.',
          actions: (
            <RequirePermission anyOf={['catalog.tags.manage']} inline={null}>
              <Button
                onClick={() => {
                  setEditingTag(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> New tag
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Filter this page…"
            actions={
              <>
                <ExportButton
                  rows={tags.map((t) => ({ name: t.name, slug: t.slug }))}
                  columns={[
                    { key: 'name', header: 'Name' },
                    { key: 'slug', header: 'Slug' },
                  ]}
                  filename="tags"
                />
                <RequirePermission anyOf={['catalog.tags.manage']} inline={null}>
                  <ImportDialog
                    trigger={<Button variant="outline" size="sm">Import CSV</Button>}
                    title="Import tags"
                    description="CSV columns: name (required), slug."
                    onImport={async (rows) => {
                      const result = await runCsvImport(
                        rows,
                        (row) => {
                          if (!row.name) throw new Error('Missing required field: name');
                          return { name: row.name, slug: row.slug || undefined };
                        },
                        (input) => createTag(apiClient, input),
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
                { label: 'Restore', onClick: () => runBulk('restore') },
                {
                  label: 'Delete',
                  variant: 'destructive',
                  onClick: () => runBulk('delete'),
                  confirm: {
                    title: `Delete ${selectedIds.size} selected ${selectedIds.size === 1 ? 'tag' : 'tags'}?`,
                    description:
                      "Tags still assigned to a product can't be deleted — those will fail and stay, with the reason shown per item. Untag the affected products before deleting. This cannot be undone for the ones that do delete.",
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
          data={tags}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ title: 'No tags yet', description: 'Create your first tag to get started.' }}
          selectedIds={canManage ? selectedIds : undefined}
          onSelectionChange={canManage ? setSelectedIds : undefined}
        />
      </CrudPageLayout>

      <TagFormDialog open={formOpen} onOpenChange={setFormOpen} tag={editingTag} />

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
