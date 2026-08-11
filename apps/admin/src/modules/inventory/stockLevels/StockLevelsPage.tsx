import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, SlidersHorizontal } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Select, Text } from '@nexgen/ui';
import type { StockItemDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { useAllWarehouses } from '../warehouses/queries.js';
import { StockHealthBadge } from '../shared/StockHealthBadge.js';
import { useStockItems } from './queries.js';
import { AdjustStockDialog } from './AdjustStockDialog.js';
import { StockItemDetailDrawer } from './StockItemDetailDrawer.js';
import { ProductAndSkuCell } from './ProductAndSkuCell.js';
import { AvailabilityCell } from './AvailabilityCell.js';
import { InventoryKpiSummary } from './InventoryKpiSummary.js';

export function StockLevelsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canManage = can('inventory.stock.manage');

  const { data: warehouses, status: warehousesStatus } = useAllWarehouses();
  const hasMultipleWarehouses = (warehouses?.length ?? 0) > 1;
  const warehouseById = useMemo(() => new Map((warehouses ?? []).map((w) => [w.id, w])), [warehouses]);

  const [skuFilter, setSkuFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [skuFilter, warehouseFilter]);

  const { data, status, refetch } = useStockItems({
    sku: skuFilter.trim() || undefined,
    warehouseId: warehouseFilter === 'all' ? undefined : warehouseFilter,
    page,
  });
  const stockItems = data?.data ?? [];

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPrefill, setAdjustPrefill] = useState<{ warehouseId?: string; sku?: string }>({});
  const [detailItem, setDetailItem] = useState<StockItemDTO | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(false);

  function openAdjust(prefill: { warehouseId?: string; sku?: string } = {}): void {
    setAdjustPrefill(prefill);
    setAdjustOpen(true);
  }

  function openDetail(row: StockItemDTO): void {
    setDetailItem(row);
    setDetailOpen(true);
  }

  const columns: DataTableColumn<StockItemDTO>[] = useMemo(() => {
    const cols: DataTableColumn<StockItemDTO>[] = [
      { id: 'product', header: 'Product', cell: (row) => <ProductAndSkuCell sku={row.sku} /> },
      {
        id: 'health',
        header: 'Status',
        cell: (row) => <StockHealthBadge item={row} warehouseStatus={warehouseById.get(row.warehouseId)?.status} />,
      },
    ];
    if (hasMultipleWarehouses) {
      cols.push({ id: 'warehouse', header: 'Warehouse', cell: (row) => warehouseById.get(row.warehouseId)?.name ?? '—' });
    }
    cols.push({ id: 'available', header: 'Available', cell: (row) => <AvailabilityCell item={row} />, className: 'text-right' });
    if (canManage) {
      cols.push({
        id: 'actions',
        header: '',
        className: 'w-12',
        cell: (row) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Adjust stock for ${row.sku}`}
            onClick={(e) => {
              e.stopPropagation();
              openAdjust({ warehouseId: row.warehouseId, sku: row.sku });
            }}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        ),
      });
    }
    return cols;
  }, [hasMultipleWarehouses, warehouseById, canManage]);

  // No warehouse exists at all yet — Stock Levels (and Adjust Stock) both
  // need one to mean anything, per `AdjustStockRequest`'s own
  // `exists:warehouses,id` rule. Guide the merchant to set one up rather
  // than show an empty table with a dead-end "Adjust" button.
  if (warehousesStatus === 'success' && (warehouses?.length ?? 0) === 0) {
    return (
      <CrudPageLayout header={{ title: 'Stock Levels', description: 'Where your stock is, and how much is available to sell.' }}>
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-border py-16 text-center">
          <Boxes className="size-10 text-text-secondary" aria-hidden="true" />
          <div>
            <Text variant="body-strong">Create a warehouse to start tracking stock</Text>
            <Text variant="body" className="mt-1 text-text-secondary">
              Inventory needs at least one warehouse before any stock can be recorded.
            </Text>
          </div>
          <RequirePermission anyOf={['inventory.warehouses.manage']} inline={null}>
            <Button onClick={() => void navigate('/inventory/warehouses')}>Create a warehouse</Button>
          </RequirePermission>
        </div>
      </CrudPageLayout>
    );
  }

  return (
    <div>
      <InventoryKpiSummary
        warehouseCount={warehouses?.length}
        totalStockItems={data?.meta?.total}
        pageItems={stockItems}
        warehouseById={warehouseById}
        loading={status === 'pending' || warehousesStatus === 'pending'}
      />

      <CrudPageLayout
        header={{
          title: 'Stock Levels',
          description: 'Where your stock is, and how much is available to sell.',
          actions: (
            <RequirePermission anyOf={['inventory.stock.manage']} inline={null}>
              <Button onClick={() => openAdjust()}>
                <SlidersHorizontal className="size-4" /> Adjust stock
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={skuFilter}
            onSearchChange={setSkuFilter}
            searchPlaceholder="Search by exact SKU…"
            filters={
              hasMultipleWarehouses ? (
                <FilterBar
                  active={warehouseFilter === 'all' ? [] : [{ key: 'warehouse', label: 'Warehouse', displayValue: warehouseById.get(warehouseFilter)?.name ?? '' }]}
                  onRemove={() => setWarehouseFilter('all')}
                >
                  <Select
                    label="Warehouse"
                    value={warehouseFilter}
                    onValueChange={setWarehouseFilter}
                    options={[{ value: 'all', label: 'All warehouses' }, ...(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))]}
                  />
                </FilterBar>
              ) : undefined
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
          data={stockItems}
          getRowId={(row) => row.id}
          status={status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          onRowClick={openDetail}
          emptyState={
            skuFilter.trim()
              ? {
                  icon: <Boxes className="size-8" aria-hidden="true" />,
                  title: 'No match',
                  description: `No stock item found for SKU "${skuFilter.trim()}" — SKU search matches exactly, not partially.`,
                }
              : {
                  icon: <Boxes className="size-8" aria-hidden="true" />,
                  title: 'No stock recorded yet',
                  description: canManage ? 'Adjust stock to record the first quantity for a SKU.' : 'No stock has been recorded yet.',
                  action: canManage ? { label: 'Adjust stock', onClick: () => openAdjust() } : undefined,
                }
          }
        />
      </CrudPageLayout>

      <AdjustStockDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        initialWarehouseId={adjustPrefill.warehouseId}
        initialSku={adjustPrefill.sku}
      />
      <StockItemDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        stockItem={detailItem}
        warehouse={detailItem ? warehouseById.get(detailItem.warehouseId) : undefined}
        canManage={canManage}
        onAdjust={() => {
          setDetailOpen(false);
          openAdjust({ warehouseId: detailItem?.warehouseId, sku: detailItem?.sku });
        }}
      />
    </div>
  );
}
