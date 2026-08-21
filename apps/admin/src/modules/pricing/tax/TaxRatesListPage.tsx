import { useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Archive, Trash2, Percent } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, Text, useToast } from '@nexgen/ui';
import type { TaxRateDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { formatPercent } from '../shared/formatPercent.js';
import { useAllTaxZones, useAllTaxClasses, useAllTaxRates, useArchiveTaxRate, useDestroyTaxRate } from './queries.js';
import { TaxRateFormDialog } from './TaxRateFormDialog.js';

type StatusFilter = 'all' | 'active' | 'archived';
const PAGE_SIZE = 20;

/**
 * Tax Rates — `pricing.tax.view` (list), `.manage` (create/edit/archive/
 * delete). `TaxRateController::index` (apps/backend) genuinely supports
 * `status`/`tax_zone_id`/`tax_class_id` server-side, but no free-text
 * `search` (a rate has no name to search) and no `sort` — this screen
 * fetches the complete collection once (same low-cardinality reasoning as
 * `TaxZonesListPage`/`TaxClassesListPage`) and applies Zone/Class/Status as
 * real, complete client-side filters.
 *
 * `TaxRateResource` never embeds the related zone/class (only their raw
 * ids) — `TaxRate` belongs to both `TaxZone` and `TaxClass` but the
 * resource intentionally stays flat (confirmed by reading the resource
 * directly). Zone/class names are cross-referenced client-side against the
 * already-fully-loaded zone/class collections — a plain id→name lookup,
 * not the debounced live-search pattern `catalogLookup.ts` needs for
 * Catalog's own, much larger Products collection.
 */
export function TaxRatesListPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('pricing.tax.manage');

  const { data: allRates, status: queryStatus, refetch } = useAllTaxRates();
  const { data: allZones } = useAllTaxZones();
  const { data: allClasses } = useAllTaxClasses();
  const rates = useMemo(() => allRates ?? [], [allRates]);
  const zones = useMemo(() => allZones ?? [], [allZones]);
  const classes = useMemo(() => allClasses ?? [], [allClasses]);

  const zoneNameById = useMemo(() => new Map(zones.map((z) => [z.id, z.region ? `${z.name} (${z.countryCode}-${z.region})` : `${z.name} (${z.countryCode})`])), [zones]);
  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rates;
    if (status !== 'all') result = result.filter((r) => r.status === status);
    if (zoneFilter !== 'all') result = result.filter((r) => r.taxZoneId === zoneFilter);
    if (classFilter !== 'all') result = result.filter((r) => r.taxClassId === classFilter);
    return result;
  }, [rates, status, zoneFilter, classFilter]);

  useEffect(() => setPage(1), [status, zoneFilter, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const archiveMutation = useArchiveTaxRate();
  const destroyMutation = useDestroyTaxRate();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRateDTO | undefined>(undefined);

  function openCreate(): void {
    setEditingRate(undefined);
    setFormOpen(true);
  }

  function openEdit(rate: TaxRateDTO): void {
    setEditingRate(rate);
    setFormOpen(true);
  }

  async function handleArchive(rate: TaxRateDTO): Promise<void> {
    try {
      await archiveMutation.mutateAsync({ id: rate.id, expectedVersion: rate.version });
      toast({ variant: 'success', title: 'Tax rate archived', description: 'The rate is now archived.' });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't archive tax rate", description: pricingErrorMessage(error) });
    }
  }

  const zoneOptions = useMemo(() => [{ value: 'all', label: 'All zones' }, ...zones.map((z) => ({ value: z.id, label: zoneNameById.get(z.id) ?? z.name }))], [zones, zoneNameById]);
  const classOptions = useMemo(() => [{ value: 'all', label: 'All classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))], [classes]);

  const columns: DataTableColumn<TaxRateDTO>[] = useMemo(
    () => [
      { id: 'zone', header: 'Zone', cell: (row) => <Text variant="body-strong">{zoneNameById.get(row.taxZoneId) ?? row.taxZoneId}</Text> },
      { id: 'class', header: 'Class', cell: (row) => classNameById.get(row.taxClassId) ?? row.taxClassId },
      { id: 'rate', header: 'Rate', cell: (row) => <span className="tabular-nums">{formatPercent(row.rate)}</span> },
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
          <RequirePermission anyOf={['pricing.tax.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Actions for ${zoneNameById.get(row.taxZoneId) ?? row.taxZoneId} × ${classNameById.get(row.taxClassId) ?? row.taxClassId}`}
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
                  title="Delete this tax rate?"
                  description="This rate will be permanently deleted. This cannot be undone."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => destroyMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}
                  getErrorMessage={pricingErrorMessage}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleArchive/destroyMutation are stable enough for this list's own lifetime
    [destroyMutation, zoneNameById, classNameById],
  );

  const activeFilters = [
    ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status }]),
    ...(zoneFilter === 'all' ? [] : [{ key: 'zone', label: 'Zone', displayValue: zoneNameById.get(zoneFilter) ?? zoneFilter }]),
    ...(classFilter === 'all' ? [] : [{ key: 'class', label: 'Class', displayValue: classNameById.get(classFilter) ?? classFilter }]),
  ];

  function clearFilter(key: string): void {
    if (key === 'status') setStatus('all');
    if (key === 'zone') setZoneFilter('all');
    if (key === 'class') setClassFilter('all');
  }

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Tax Rates',
          description: 'The rate applied when a tax class is taxed within a tax zone — one rate per zone × class pair.',
          actions: (
            <RequirePermission anyOf={['pricing.tax.manage']} inline={null}>
              <Button onClick={openCreate} disabled={zones.length === 0 || classes.length === 0}>
                <Plus className="size-4" /> New tax rate
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            filters={
              <FilterBar active={activeFilters} onRemove={clearFilter} onClearAll={() => { setStatus('all'); setZoneFilter('all'); setClassFilter('all'); }}>
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
                  <Select label="Class" value={classFilter} onValueChange={setClassFilter} options={classOptions} />
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
            status !== 'all' || zoneFilter !== 'all' || classFilter !== 'all'
              ? {
                  icon: <Percent className="size-8" aria-hidden="true" />,
                  title: 'No matching tax rates',
                  description: 'No tax rates match the current filter.',
                }
              : {
                  icon: <Percent className="size-8" aria-hidden="true" />,
                  title: 'No tax rates yet',
                  description:
                    zones.length === 0 || classes.length === 0
                      ? 'Create at least one tax zone and one tax class first, then assign a rate between them.'
                      : canManage
                        ? 'Assign a rate between a tax zone and a tax class.'
                        : 'No tax rates have been created yet.',
                  action: canManage && zones.length > 0 && classes.length > 0 ? { label: 'New tax rate', onClick: openCreate } : undefined,
                }
          }
        />
      </CrudPageLayout>

      <TaxRateFormDialog open={formOpen} onOpenChange={setFormOpen} taxRate={editingRate} taxZones={zones} taxClasses={classes} />
    </div>
  );
}
