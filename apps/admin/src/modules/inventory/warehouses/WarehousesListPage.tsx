import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Archive, Trash2, Star, Warehouse as WarehouseIcon } from 'lucide-react';
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
  useToast,
} from '@nexgen/ui';
import type { WarehouseDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { inventoryErrorMessage } from '../shared/errors.js';
import { useWarehouses, useArchiveWarehouse, useDestroyWarehouse } from './queries.js';
import { WarehouseFormDialog } from './WarehouseFormDialog.js';
import { WarehouseStockCountCell } from './WarehouseStockCountCell.js';

type StatusFilter = 'all' | 'active' | 'archived';

export function WarehousesListPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('inventory.warehouses.manage');
  const canViewStock = can('inventory.stock.view');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseDTO | undefined>(undefined);

  // `WarehouseController::index` (apps/backend) supports a `status` filter
  // only — no server-side `search` — so this filters client-side over the
  // currently-loaded page, same honest "Filter this page…" treatment
  // Catalog's own taxonomy list pages use for the identical backend shape.
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [status]);

  const { data, status: queryStatus, refetch } = useWarehouses({ status: status === 'all' ? undefined : status, page });
  const allWarehouses = useMemo(() => data?.data ?? [], [data]);
  const warehouses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allWarehouses;
    return allWarehouses.filter((w) => w.name.toLowerCase().includes(term) || w.code.toLowerCase().includes(term));
  }, [allWarehouses, search]);

  const archiveMutation = useArchiveWarehouse();
  const destroyMutation = useDestroyWarehouse();

  const handleArchive = useCallback(
    async (row: WarehouseDTO): Promise<void> => {
      try {
        await archiveMutation.mutateAsync({ id: row.id, expectedVersion: row.version });
        toast({ variant: 'success', title: 'Warehouse archived', description: `"${row.name}" is now archived.` });
      } catch (error) {
        toast({ variant: 'danger', title: "Couldn't archive warehouse", description: inventoryErrorMessage(error) });
      }
    },
    [archiveMutation, toast],
  );

  // No `handleRestore` here — found during the Inventory Freeze audit:
  // `POST /warehouses/{id}/restore` only reverses a *soft-delete*
  // (`$warehouse->restore()` clears `deleted_at`), it never touches
  // `status`. `WarehouseController::index()` also never lists soft-deleted
  // rows, so no row this page can render is ever actually in that
  // soft-deleted state — meaning a "Restore" action wired to an archived
  // row here would always be a silent no-op: a 200 response and a
  // misleading success toast, with the warehouse staying archived forever.
  // There is currently no backend action that reverses `archive` (neither
  // `UpdateWarehouseRequest` nor any other route accepts a `status`
  // change), and adding one is a new API contract this audit's own rules
  // don't allow inventing. The honest fix available within the existing
  // backend is to not offer an action that doesn't work — see the Inventory
  // Freeze report for the follow-up recommendation (a real "reactivate
  // warehouse" capability) this leaves for Product Owner decision.

  const columns: DataTableColumn<WarehouseDTO>[] = useMemo(() => {
    const cols: DataTableColumn<WarehouseDTO>[] = [
      {
        id: 'name',
        header: 'Name',
        cell: (row) => (
          <div>
            <div className="flex items-center gap-2">
              <Text variant="body-strong">{row.name}</Text>
              {row.isDefault && (
                <Badge variant="info" className="gap-1">
                  <Star className="size-3" aria-hidden="true" /> Default
                </Badge>
              )}
            </div>
            <Text variant="caption" className="text-text-secondary">
              {row.code}
            </Text>
          </div>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        cell: (row) => [row.address.city, row.address.countryCode].filter(Boolean).join(', ') || <span className="text-text-secondary">—</span>,
      },
    ];
    if (canViewStock) {
      cols.push({ id: 'stock', header: 'Stock', cell: (row) => <WarehouseStockCountCell warehouseId={row.id} /> });
    }
    cols.push({
      id: 'status',
      header: 'Status',
      cell: (row) => <Badge variant={row.status === 'active' ? 'success' : 'default'}>{row.status}</Badge>,
    });
    cols.push(
      {
        id: 'actions',
        header: '',
        className: 'w-10',
        cell: (row) => (
          <RequirePermission anyOf={['inventory.warehouses.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={() => {
                    setEditingWarehouse(row);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                {row.status === 'active' && (
                  <DropdownMenuItem onSelect={() => void handleArchive(row)}>
                    <Archive className="size-4" /> Archive
                  </DropdownMenuItem>
                )}
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  }
                  title="Delete this warehouse?"
                  description={`"${row.name}" will be permanently deleted. This cannot be undone.`}
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => destroyMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}
                  getErrorMessage={inventoryErrorMessage}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
        ),
      },
    );
    return cols;
  }, [canViewStock, destroyMutation, handleArchive]);

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Warehouses',
          description: 'The stock-holding locations Inventory tracks. Start with one — add more any time.',
          actions: (
            <RequirePermission anyOf={['inventory.warehouses.manage']} inline={null}>
              <Button
                onClick={() => {
                  setEditingWarehouse(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> New warehouse
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
          />
        }
        pagination={
          data?.meta?.last_page
            ? { currentPage: data.meta.current_page ?? page, totalPages: data.meta.last_page, onPageChange: setPage }
            : undefined
        }
      >
        <DataTable
          columns={columns}
          data={warehouses}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{
            icon: <WarehouseIcon className="size-8" aria-hidden="true" />,
            title: 'No warehouses yet',
            description: 'Create your first warehouse to start tracking stock.',
            action: canManage
              ? {
                  label: 'New warehouse',
                  onClick: () => {
                    setEditingWarehouse(undefined);
                    setFormOpen(true);
                  },
                }
              : undefined,
          }}
        />
      </CrudPageLayout>

      <WarehouseFormDialog open={formOpen} onOpenChange={setFormOpen} warehouse={editingWarehouse} />
    </div>
  );
}
