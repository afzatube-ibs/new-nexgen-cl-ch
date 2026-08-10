import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, ArchiveRestore, Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Text } from '@nexgen/ui';
import { createAttributeGroup, type AttributeGroupDTO } from '@nexgen/api-client';
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
import { runCsvImport } from '../shared/csvImport.js';
import { useAttributeGroups, useDestroyAttributeGroup, useRestoreAttributeGroup } from './queries.js';
import { AttributeGroupFormDialog } from './AttributeGroupFormDialog.js';

/** `AttributeGroupController::index` (apps/backend) takes no query params — filtered client-side. No `status` column. */
export function AttributeGroupsListPage() {
  const { can } = useAuth();
  const canManage = can('catalog.attributes.manage');

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeGroupDTO | undefined>(undefined);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'restore' | 'delete' | null>(null);

  const { data, status: queryStatus, refetch } = useAttributeGroups(undefined);
  const allGroups = useMemo(() => data?.data ?? [], [data]);
  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allGroups;
    return allGroups.filter((g) => g.name.toLowerCase().includes(term) || g.code.toLowerCase().includes(term));
  }, [allGroups, search]);

  const destroyMutation = useDestroyAttributeGroup();
  const restoreMutation = useRestoreAttributeGroup();

  const bulk = useBulkOperation<AttributeGroupDTO>();

  function runBulk(action: 'restore' | 'delete'): void {
    const items: BulkItem<AttributeGroupDTO>[] = groups
      .filter((g) => selectedIds.has(g.id))
      .map((g) => ({ id: g.id, label: g.name, data: g }));
    setBulkAction(action);
    setBulkDialogOpen(true);
    const operation = async (item: BulkItem<AttributeGroupDTO>): Promise<void> => {
      if (action === 'restore') await restoreMutation.mutateAsync(item.id);
      else if (action === 'delete') await destroyMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
    };
    void bulk.run(items, operation).then(() => {
      setSelectedIds(new Set());
      void refetch();
    });
  }

  const columns: DataTableColumn<AttributeGroupDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'code', header: 'Code', cell: (row) => row.code },
      {
        id: 'actions',
        header: '',
        className: 'w-10',
        cell: (row) => (
          <RequirePermission anyOf={['catalog.attributes.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={() => {
                    setEditing(row);
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
                  title="Delete this attribute group?"
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
    [restoreMutation, destroyMutation],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Attribute Groups',
          description: 'Organize attributes into groups.',
          actions: (
            <RequirePermission anyOf={['catalog.attributes.manage']} inline={null}>
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> New group
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
                  rows={groups.map((g) => ({ name: g.name, code: g.code }))}
                  columns={[
                    { key: 'name', header: 'Name' },
                    { key: 'code', header: 'Code' },
                  ]}
                  filename="attribute-groups"
                />
                <RequirePermission anyOf={['catalog.attributes.manage']} inline={null}>
                  <ImportDialog
                    trigger={<Button variant="outline" size="sm">Import CSV</Button>}
                    title="Import attribute groups"
                    description="CSV columns: name (required), code (required)."
                    onImport={async (rows) => {
                      const result = await runCsvImport(
                        rows,
                        (row) => {
                          if (!row.name) throw new Error('Missing required field: name');
                          if (!row.code) throw new Error('Missing required field: code');
                          return { name: row.name, code: row.code };
                        },
                        (input) => createAttributeGroup(apiClient, input),
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
                    title: `Delete ${selectedIds.size} selected ${selectedIds.size === 1 ? 'attribute group' : 'attribute groups'}?`,
                    description: 'Attributes in these groups will be ungrouped, not deleted. This cannot be undone.',
                  },
                },
              ]}
            />
          ) : undefined
        }
      >
        <DataTable
          columns={columns}
          data={groups}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ title: 'No attribute groups yet', description: 'Create your first group to get started.' }}
          selectedIds={canManage ? selectedIds : undefined}
          onSelectionChange={canManage ? setSelectedIds : undefined}
        />
      </CrudPageLayout>

      <AttributeGroupFormDialog open={formOpen} onOpenChange={setFormOpen} attributeGroup={editing} />

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
