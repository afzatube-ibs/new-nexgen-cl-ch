import { useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Archive, Trash2, Scale } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, Text, useToast } from '@nexgen/ui';
import type { ShippingRateDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { shippingErrorMessage } from '../shared/errors.js';
import { formatWeightBand } from '../shared/formatWeight.js';
import { useAllShippingZones, useAllShippingMethods, useAllShippingRates, useArchiveShippingRate, useDestroyShippingRate } from '../shared/queries.js';
import { RateFormDialog } from './RateFormDialog.js';

type StatusFilter = 'all' | 'active' | 'archived';
const PAGE_SIZE = 20;

/**
 * Shipping Rates — `shipping.rates.view` (list), `.manage` (create/edit/
 * archive/delete). `ShippingRateController::index` (apps/backend) genuinely
 * supports `status`/`shipping_zone_id`/`shipping_method_id` server-side,
 * but no free-text `search` (a rate has no name) and no `sort` — this
 * screen fetches the complete collection once (same reasoning as
 * `ZonesListPage`/`MethodsListPage`) and applies Zone/Method/Status as
 * real, complete client-side filters.
 *
 * `ShippingRateResource` never embeds the related zone/method (only their
 * raw ids) — confirmed by reading the resource directly. Zone/method names
 * are cross-referenced client-side against the already-fully-loaded
 * collections, the identical shape Pricing's own `TaxRatesListPage` uses
 * for its zone/class lookups.
 *
 * "Shipping Rates" and "Shipping Rules" are the same concept in this
 * backend — confirmed via `ShippingRate`'s own docblock — there is no
 * separate Rules entity to build a screen for.
 */
export function RatesListPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('shipping.rates.manage');

  const { data: allRates, status: queryStatus, refetch } = useAllShippingRates();
  const { data: allZones } = useAllShippingZones();
  const { data: allMethods } = useAllShippingMethods();
  const rates = useMemo(() => allRates ?? [], [allRates]);
  const zones = useMemo(() => allZones ?? [], [allZones]);
  const methods = useMemo(() => allMethods ?? [], [allMethods]);

  const zoneNameById = useMemo(() => new Map(zones.map((z) => [z.id, z.region ? `${z.name} (${z.countryCode}-${z.region})` : `${z.name} (${z.countryCode})`])), [zones]);
  const methodNameById = useMemo(() => new Map(methods.map((m) => [m.id, m.name])), [methods]);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rates;
    if (status !== 'all') result = result.filter((r) => r.status === status);
    if (zoneFilter !== 'all') result = result.filter((r) => r.shippingZoneId === zoneFilter);
    if (methodFilter !== 'all') result = result.filter((r) => r.shippingMethodId === methodFilter);
    return result;
  }, [rates, status, zoneFilter, methodFilter]);

  useEffect(() => setPage(1), [status, zoneFilter, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const archiveMutation = useArchiveShippingRate();
  const destroyMutation = useDestroyShippingRate();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRateDTO | undefined>(undefined);

  function openCreate(): void {
    setEditingRate(undefined);
    setFormOpen(true);
  }

  function openEdit(rate: ShippingRateDTO): void {
    setEditingRate(rate);
    setFormOpen(true);
  }

  async function handleArchive(rate: ShippingRateDTO): Promise<void> {
    try {
      await archiveMutation.mutateAsync({ id: rate.id, expectedVersion: rate.version });
      toast({ variant: 'success', title: 'Shipping rate archived', description: 'The rate is now archived.' });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't archive shipping rate", description: shippingErrorMessage(error) });
    }
  }

  const zoneOptions = useMemo(() => [{ value: 'all', label: 'All zones' }, ...zones.map((z) => ({ value: z.id, label: zoneNameById.get(z.id) ?? z.name }))], [zones, zoneNameById]);
  const methodOptions = useMemo(() => [{ value: 'all', label: 'All methods' }, ...methods.map((m) => ({ value: m.id, label: methodNameById.get(m.id) ?? m.name }))], [methods, methodNameById]);

  const columns: DataTableColumn<ShippingRateDTO>[] = useMemo(
    () => [
      { id: 'zone', header: 'Zone', cell: (row) => <Text variant="body-strong">{zoneNameById.get(row.shippingZoneId) ?? row.shippingZoneId}</Text> },
      { id: 'method', header: 'Method', cell: (row) => methodNameById.get(row.shippingMethodId) ?? row.shippingMethodId },
      { id: 'weight', header: 'Weight band', cell: (row) => <span className="tabular-nums">{formatWeightBand(row.minWeightGrams, row.maxWeightGrams)}</span> },
      { id: 'amount', header: 'Amount', cell: (row) => <span className="tabular-nums">{row.amount} {row.currencyCode}</span> },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <Badge className={row.status === 'active' ? 'bg-feedback-success text-black' : undefined}>{row.status}</Badge>,
      },
      {
        id: 'updated',
        header: 'Updated',
        cell: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'),
      },
      {
        id: 'actions',
        header: '',
        className: 'w-10',
        cell: (row) => (
          <RequirePermission anyOf={['shipping.rates.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Actions for ${zoneNameById.get(row.shippingZoneId) ?? row.shippingZoneId} × ${methodNameById.get(row.shippingMethodId) ?? row.shippingMethodId}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={() => openEdit(row)}>
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
                  title="Delete this shipping rate?"
                  description="This rate will be permanently deleted. This cannot be undone."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => destroyMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}
                  getErrorMessage={shippingErrorMessage}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleArchive/destroyMutation are stable enough for this list's own lifetime
    [destroyMutation, zoneNameById, methodNameById],
  );

  const activeFilters = [
    ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status }]),
    ...(zoneFilter === 'all' ? [] : [{ key: 'zone', label: 'Zone', displayValue: zoneNameById.get(zoneFilter) ?? zoneFilter }]),
    ...(methodFilter === 'all' ? [] : [{ key: 'method', label: 'Method', displayValue: methodNameById.get(methodFilter) ?? methodFilter }]),
  ];

  function clearFilter(key: string): void {
    if (key === 'status') setStatus('all');
    if (key === 'zone') setZoneFilter('all');
    if (key === 'method') setMethodFilter('all');
  }

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Shipping Rates',
          description: 'The price charged when a shipping method is used within a zone, banded by parcel weight — one rate per zone × method × weight band.',
          actions: (
            <RequirePermission anyOf={['shipping.rates.manage']} inline={null}>
              <Button onClick={openCreate} disabled={zones.length === 0 || methods.length === 0}>
                <Plus className="size-4" /> New rate
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            filters={
              <FilterBar active={activeFilters} onRemove={clearFilter} onClearAll={() => { setStatus('all'); setZoneFilter('all'); setMethodFilter('all'); }}>
                <div className="flex flex-col gap-3">
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
                  <Select label="Zone" value={zoneFilter} onValueChange={setZoneFilter} options={zoneOptions} />
                  <Select label="Method" value={methodFilter} onValueChange={setMethodFilter} options={methodOptions} />
                </div>
              </FilterBar>
            }
          />
        }
        pagination={filtered.length > PAGE_SIZE ? { currentPage: page, totalPages, onPageChange: setPage } : undefined}
      >
        <DataTable
          columns={columns}
          data={pageItems}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={
            status !== 'all' || zoneFilter !== 'all' || methodFilter !== 'all'
              ? {
                  icon: <Scale className="size-8" aria-hidden="true" />,
                  title: 'No matching shipping rates',
                  description: 'No shipping rates match the current filter.',
                }
              : {
                  icon: <Scale className="size-8" aria-hidden="true" />,
                  title: 'No shipping rates yet',
                  description:
                    zones.length === 0 || methods.length === 0
                      ? 'Create at least one shipping zone and one shipping method first, then assign a rate between them.'
                      : canManage
                        ? 'Assign a rate between a shipping zone and a shipping method.'
                        : 'No shipping rates have been created yet.',
                  action: canManage && zones.length > 0 && methods.length > 0 ? { label: 'New rate', onClick: openCreate } : undefined,
                }
          }
        />
      </CrudPageLayout>

      <RateFormDialog open={formOpen} onOpenChange={setFormOpen} rate={editingRate} zones={zones} methods={methods} />
    </div>
  );
}
