import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, ArchiveRestore, Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Text } from '@nexgen/ui';
import { createAttribute, ATTRIBUTE_TYPES, type AttributeDTO, type AttributeType } from '@nexgen/api-client';
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
import { useAttributes, useDestroyAttribute, useRestoreAttribute } from './queries.js';
import { AttributeFormDialog } from './AttributeFormDialog.js';

function isAttributeType(value: string): value is AttributeType {
  return (ATTRIBUTE_TYPES as readonly string[]).includes(value);
}

/** `AttributeController::index` (apps/backend) takes no query params — filtered client-side. No `status` column. */
export function AttributesListPage() {
  const { can } = useAuth();
  const canManage = can('catalog.attributes.manage');

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeDTO | undefined>(undefined);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'restore' | 'delete' | null>(null);

  const { data, status: queryStatus, refetch } = useAttributes(undefined);
  const allAttributes = useMemo(() => data?.data ?? [], [data]);
  const attributes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allAttributes;
    return allAttributes.filter((a) => a.name.toLowerCase().includes(term) || a.code.toLowerCase().includes(term));
  }, [allAttributes, search]);

  const destroyMutation = useDestroyAttribute();
  const restoreMutation = useRestoreAttribute();

  const bulk = useBulkOperation<AttributeDTO>();

  function runBulk(action: 'restore' | 'delete'): void {
    const items: BulkItem<AttributeDTO>[] = attributes
      .filter((a) => selectedIds.has(a.id))
      .map((a) => ({ id: a.id, label: a.name, data: a }));
    setBulkAction(action);
    setBulkDialogOpen(true);
    const operation = async (item: BulkItem<AttributeDTO>): Promise<void> => {
      if (action === 'restore') await restoreMutation.mutateAsync(item.id);
      else if (action === 'delete') await destroyMutation.mutateAsync({ id: item.id, expectedVersion: item.data!.version });
    };
    void bulk.run(items, operation).then(() => {
      setSelectedIds(new Set());
      void refetch();
    });
  }

  const columns: DataTableColumn<AttributeDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'code', header: 'Code', cell: (row) => row.code },
      { id: 'type', header: 'Type', cell: (row) => <Badge variant="outline">{row.type}</Badge> },
      { id: 'filterable', header: 'Filterable', cell: (row) => (row.isFilterable ? 'Yes' : 'No') },
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
                  title="Delete this attribute?"
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
          title: 'Attributes',
          description: 'Product-level facts used for filtering and display (color, material, and so on).',
          actions: (
            <RequirePermission anyOf={['catalog.attributes.manage']} inline={null}>
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> New attribute
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
                  rows={attributes.map((a) => ({ name: a.name, code: a.code, type: a.type, isFilterable: a.isFilterable }))}
                  columns={[
                    { key: 'name', header: 'Name' },
                    { key: 'code', header: 'Code' },
                    { key: 'type', header: 'Type' },
                    { key: 'isFilterable', header: 'Filterable' },
                  ]}
                  filename="attributes"
                />
                <RequirePermission anyOf={['catalog.attributes.manage']} inline={null}>
                  <ImportDialog
                    trigger={<Button variant="outline" size="sm">Import CSV</Button>}
                    title="Import attributes"
                    description="CSV columns: name (required), code (required), type (text|number|boolean|select|multiselect|date). Attribute group assignment isn't supported via import."
                    onImport={async (rows) => {
                      const result = await runCsvImport(
                        rows,
                        (row) => {
                          if (!row.name) throw new Error('Missing required field: name');
                          if (!row.code) throw new Error('Missing required field: code');
                          const type = row.type && isAttributeType(row.type) ? row.type : 'text';
                          return { name: row.name, code: row.code, type };
                        },
                        (input) => createAttribute(apiClient, input),
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
                { label: 'Delete', variant: 'destructive', onClick: () => runBulk('delete') },
              ]}
            />
          ) : undefined
        }
      >
        <DataTable
          columns={columns}
          data={attributes}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ title: 'No attributes yet', description: 'Create your first attribute to get started.' }}
          selectedIds={canManage ? selectedIds : undefined}
          onSelectionChange={canManage ? setSelectedIds : undefined}
        />
      </CrudPageLayout>

      <AttributeFormDialog open={formOpen} onOpenChange={setFormOpen} attribute={editing} />

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
