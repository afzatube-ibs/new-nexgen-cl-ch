import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, ArchiveRestore, Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Text } from '@nexgen/ui';
import type { OptionDTO } from '@nexgen/api-client';
import {
  CrudPageLayout,
  Toolbar,
  BulkActionsBar,
  ConfirmDialog,
  ExportButton,
  RequirePermission,
  useBulkOperation,
  BulkOperationDialog,
  type BulkItem,
} from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { useOptions, useDestroyOption, useRestoreOption } from './queries.js';
import { OptionFormDialog } from './OptionFormDialog.js';

/**
 * `OptionController::index` (apps/backend) takes no query params — filtered
 * client-side. No `status` column. No CSV import — Options are nested
 * (Option -> OptionValues), not a flat row, per the Phase 2.2 scope
 * decision (Brands/Categories/Collections/Tags/Attribute Groups/Attributes
 * only). Export still applies (flat, read-only).
 */
export function OptionsListPage() {
  const { can } = useAuth();
  const canManage = can('catalog.options.manage');

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'restore' | 'delete' | null>(null);

  const { data, status: queryStatus, refetch } = useOptions(undefined);
  const allOptions = useMemo(() => data?.data ?? [], [data]);
  const options = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allOptions;
    return allOptions.filter((o) => o.name.toLowerCase().includes(term) || o.code.toLowerCase().includes(term));
  }, [allOptions, search]);

  const destroyMutation = useDestroyOption();
  const restoreMutation = useRestoreOption();

  const bulk = useBulkOperation<OptionDTO>();

  function runBulk(action: 'restore' | 'delete'): void {
    const items: BulkItem<OptionDTO>[] = options
      .filter((o) => selectedIds.has(o.id))
      .map((o) => ({ id: o.id, label: o.name, data: o }));
    setBulkAction(action);
    setBulkDialogOpen(true);
    const operation = async (item: BulkItem<OptionDTO>): Promise<void> => {
      if (action === 'restore') await restoreMutation.mutateAsync(item.id);
      else if (action === 'delete') await destroyMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
    };
    void bulk.run(items, operation).then(() => {
      setSelectedIds(new Set());
      void refetch();
    });
  }

  const columns: DataTableColumn<OptionDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'code', header: 'Code', cell: (row) => row.code },
      { id: 'values', header: 'Values', cell: (row) => <Badge variant="outline">{(row.values ?? []).length}</Badge> },
      {
        id: 'actions',
        header: '',
        className: 'w-10',
        cell: (row) => (
          <RequirePermission anyOf={['catalog.options.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={() => {
                    setEditingId(row.id);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="size-4" /> Edit &amp; manage values
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
                  title="Delete this option?"
                  description={`"${row.name}" and all of its values will be permanently deleted. This cannot be undone.`}
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
    [restoreMutation, destroyMutation],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Options',
          description: 'Variant dimensions like Color or Size, each with its own set of values.',
          actions: (
            <RequirePermission anyOf={['catalog.options.manage']} inline={null}>
              <Button
                onClick={() => {
                  setEditingId(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> New option
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
              <ExportButton
                rows={options.map((o) => ({ name: o.name, code: o.code, valueCount: (o.values ?? []).length }))}
                columns={[
                  { key: 'name', header: 'Name' },
                  { key: 'code', header: 'Code' },
                  { key: 'valueCount', header: 'Value count' },
                ]}
                filename="options"
              />
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
                    title: `Delete ${selectedIds.size} selected ${selectedIds.size === 1 ? 'option' : 'options'}?`,
                    description:
                      'Options still assigned to a product or variant are protected by the backend and will fail individually with an error — this only deletes the ones that are unused. This cannot be undone.',
                  },
                },
              ]}
            />
          ) : undefined
        }
      >
        <DataTable
          columns={columns}
          data={options}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ title: 'No options yet', description: 'Create your first option to get started.' }}
          selectedIds={canManage ? selectedIds : undefined}
          onSelectionChange={canManage ? setSelectedIds : undefined}
        />
      </CrudPageLayout>

      <OptionFormDialog open={formOpen} onOpenChange={setFormOpen} optionId={editingId} />

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
