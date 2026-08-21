import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Eye, CheckCircle2, XCircle, ArrowRightLeft, ArrowRight } from 'lucide-react';
import {
  DataTable,
  type DataTableColumn,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Select,
  Text,
  useToast,
} from '@nexgen/ui';
import type { StockTransferDTO, StockTransferStatus } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { useAllWarehouses } from '../warehouses/queries.js';
import { TransferStatusBadge } from '../shared/TransferStatusBadge.js';
import { ProductAndSkuCell } from '../stockLevels/ProductAndSkuCell.js';
import { dayGroupLabel, shortTime } from '../shared/formatTimestamp.js';
import { inventoryErrorMessage } from '../shared/errors.js';
import { useStockTransfers, useCompleteStockTransfer, useCancelStockTransfer } from './queries.js';
import { InitiateTransferDialog } from './InitiateTransferDialog.js';
import { TransferDetailDrawer } from './TransferDetailDrawer.js';

type StatusFilter = 'all' | StockTransferStatus;

/**
 * Warehouse Transfers (Slice 3) — `inventory.stock.view` (list/show),
 * `inventory.transfers.manage` (start/complete/cancel). Answers, at a
 * glance: where is stock moving from, where to, what, how much, and is
 * this one still waiting on action — the same "reduce mental calculation"
 * bar Slices 1/2 already set for Stock Levels/Reservations.
 *
 * `StockTransferController::index` (apps/backend) supports a real
 * server-side `status` filter but no `sku`/warehouse search at all — so,
 * matching Warehouses' own identical backend shape, the search box is an
 * honestly-labeled "Filter this page…" client-side filter over the
 * currently-loaded page, never a fake server-search box that silently
 * does nothing.
 */
export function TransfersListPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('inventory.transfers.manage');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [status]);

  const { data, status: queryStatus, refetch } = useStockTransfers({ status: status === 'all' ? undefined : status, page });
  const allTransfers = useMemo(() => data?.data ?? [], [data]);

  const { data: warehouses } = useAllWarehouses();
  const warehouseById = useMemo(() => new Map((warehouses ?? []).map((w) => [w.id, w])), [warehouses]);

  const transfers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allTransfers;
    return allTransfers.filter((t) => {
      const from = warehouseById.get(t.fromWarehouseId);
      const to = warehouseById.get(t.toWarehouseId);
      return (
        t.sku.toLowerCase().includes(term) ||
        from?.name.toLowerCase().includes(term) ||
        from?.code.toLowerCase().includes(term) ||
        to?.name.toLowerCase().includes(term) ||
        to?.code.toLowerCase().includes(term)
      );
    });
  }, [allTransfers, search, warehouseById]);

  const completeMutation = useCompleteStockTransfer();
  const cancelMutation = useCancelStockTransfer();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailTransferId, setDetailTransferId] = useState<string | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(false);

  function openDetail(row: StockTransferDTO): void {
    setDetailTransferId(row.id);
    setDetailOpen(true);
  }

  const handleComplete = useCallback(
    async (row: StockTransferDTO): Promise<void> => {
      await completeMutation.mutateAsync(row.id);
      toast({ variant: 'success', title: 'Transfer completed', description: `${row.quantity} unit${row.quantity === 1 ? '' : 's'} of ${row.sku} moved.` });
    },
    [completeMutation, toast],
  );

  const handleCancel = useCallback(
    async (row: StockTransferDTO): Promise<void> => {
      try {
        await cancelMutation.mutateAsync(row.id);
        toast({ variant: 'success', title: 'Transfer cancelled', description: `The hold on ${row.sku} at the source has been released.` });
      } catch (error) {
        toast({ variant: 'danger', title: "Couldn't cancel transfer", description: inventoryErrorMessage(error) });
      }
    },
    [cancelMutation, toast],
  );

  const columns: DataTableColumn<StockTransferDTO>[] = useMemo(() => {
    const cols: DataTableColumn<StockTransferDTO>[] = [
      {
        id: 'route',
        header: 'Route',
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-1.5">
            <Text variant="body" className="truncate">
              {warehouseById.get(row.fromWarehouseId)?.name ?? '—'}
            </Text>
            <ArrowRight className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
            <Text variant="body" className="truncate">
              {warehouseById.get(row.toWarehouseId)?.name ?? '—'}
            </Text>
          </div>
        ),
      },
      { id: 'product', header: 'Product', cell: (row) => <ProductAndSkuCell sku={row.sku} /> },
      { id: 'quantity', header: 'Quantity', className: 'text-right', cell: (row) => <span className="tabular-nums">{row.quantity}</span> },
      { id: 'status', header: 'Status', cell: (row) => <TransferStatusBadge status={row.status} /> },
      {
        id: 'started',
        header: 'Started',
        cell: (row) => (row.createdAt ? `${dayGroupLabel(row.createdAt)}, ${shortTime(row.createdAt)}` : '—'),
      },
    ];
    if (canManage) {
      cols.push({
        id: 'actions',
        header: '',
        className: 'w-12',
        cell: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={`Actions for transfer of ${row.sku}`} onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={() => openDetail(row)}>
                <Eye className="size-4" /> View details
              </DropdownMenuItem>
              {row.status === 'pending' && (
                <>
                  <ConfirmDialog
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <CheckCircle2 className="size-4" /> Complete
                      </DropdownMenuItem>
                    }
                    title="Complete this transfer?"
                    description={`${row.quantity} unit${row.quantity === 1 ? '' : 's'} of ${row.sku} will move into ${warehouseById.get(row.toWarehouseId)?.name ?? 'the destination'}'s on-hand stock. This can't be undone from here.`}
                    confirmLabel="Complete transfer"
                    onConfirm={() => handleComplete(row)}
                    getErrorMessage={inventoryErrorMessage}
                  />
                  <DropdownMenuItem onSelect={() => void handleCancel(row)}>
                    <XCircle className="size-4" /> Cancel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      });
    }
    return cols;
  }, [canManage, warehouseById, handleComplete, handleCancel]);

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Transfers',
          description: 'Move stock between warehouses — where it came from, where it went, and what still needs completing.',
          actions: (
            <RequirePermission anyOf={['inventory.transfers.manage']} inline={null}>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> New transfer
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
                    { value: 'pending', label: 'Pending' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' },
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
          data={transfers}
          getRowId={(row) => row.id}
          onRowClick={openDetail}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={
            status !== 'all' || search.trim()
              ? {
                  icon: <ArrowRightLeft className="size-8" aria-hidden="true" />,
                  title: 'No matching transfers',
                  description: 'No transfers match the current filter or search.',
                }
              : {
                  icon: <ArrowRightLeft className="size-8" aria-hidden="true" />,
                  title: 'No transfers yet',
                  description: canManage ? 'Start a transfer to move stock between warehouses.' : 'No stock has been transferred yet.',
                  action: canManage ? { label: 'New transfer', onClick: () => setCreateOpen(true) } : undefined,
                }
          }
        />
      </CrudPageLayout>

      <InitiateTransferDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TransferDetailDrawer open={detailOpen} onOpenChange={setDetailOpen} transferId={detailTransferId} warehouseById={warehouseById} />
    </div>
  );
}
