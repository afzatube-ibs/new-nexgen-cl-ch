import { useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Archive, Trash2, MapPin } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, Text, useToast } from '@nexgen/ui';
import type { TaxZoneDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { useAllTaxZones, useArchiveTaxZone, useDestroyTaxZone } from './queries.js';
import { TaxZoneFormDialog } from './TaxZoneFormDialog.js';

type StatusFilter = 'all' | 'active' | 'archived';
const PAGE_SIZE = 20;

/**
 * Tax Zones — `pricing.tax.view` (list), `.manage` (create/edit/archive/
 * delete). `TaxZoneController::index` (apps/backend) supports a `status`
 * filter and Laravel's own `page`, but no `sort`/free-text `search` — a
 * hardcoded `orderBy('country_code')->orderBy('region')`. Same reasoning as
 * `PriceListsListPage`: fetches the complete collection once and implements
 * genuine, complete search/filter/pagination client-side against all of it.
 *
 * No "Restore" action for an archived zone — no restore endpoint exists for
 * any of Pricing's four archivable entities (confirmed by reading
 * `routes.php` directly), the same platform-wide gap Slice 1's own Price
 * Lists screen was built around from the start.
 */
export function TaxZonesListPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('pricing.tax.manage');

  const { data: allZones, status: queryStatus, refetch } = useAllTaxZones();
  const zones = useMemo(() => allZones ?? [], [allZones]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = zones;
    if (status !== 'all') result = result.filter((z) => z.status === status);
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (z) => z.name.toLowerCase().includes(term) || z.countryCode.toLowerCase().includes(term) || z.region.toLowerCase().includes(term),
      );
    }
    return result;
  }, [zones, status, search]);

  useEffect(() => setPage(1), [search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const archiveMutation = useArchiveTaxZone();
  const destroyMutation = useDestroyTaxZone();

  const [formOpen, setFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<TaxZoneDTO | undefined>(undefined);

  function openCreate(): void {
    setEditingZone(undefined);
    setFormOpen(true);
  }

  function openEdit(zone: TaxZoneDTO): void {
    setEditingZone(zone);
    setFormOpen(true);
  }

  async function handleArchive(zone: TaxZoneDTO): Promise<void> {
    try {
      await archiveMutation.mutateAsync({ id: zone.id, expectedVersion: zone.version });
      toast({ variant: 'success', title: 'Tax zone archived', description: `"${zone.name}" is now archived.` });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't archive tax zone", description: pricingErrorMessage(error) });
    }
  }

  const columns: DataTableColumn<TaxZoneDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'country', header: 'Country', cell: (row) => <span className="tabular-nums">{row.countryCode}</span> },
      {
        id: 'region',
        header: 'Region',
        cell: (row) => (row.region ? <span className="tabular-nums">{row.region}</span> : <span className="text-text-secondary">Country-wide</span>),
      },
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
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
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
                  title="Delete this tax zone?"
                  description={`"${row.name}" will be permanently deleted. This cannot be undone.`}
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
    [destroyMutation],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Tax Zones',
          description: 'Geographic tax jurisdictions — one per country or sub-national region you collect tax in.',
          actions: (
            <RequirePermission anyOf={['pricing.tax.manage']} inline={null}>
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New tax zone
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, country, or region…"
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
        pagination={filtered.length > PAGE_SIZE ? { currentPage: page, totalPages, onPageChange: setPage } : undefined}
      >
        <DataTable
          columns={columns}
          data={pageItems}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={
            status !== 'all' || search.trim()
              ? {
                  icon: <MapPin className="size-8" aria-hidden="true" />,
                  title: 'No matching tax zones',
                  description: 'No tax zones match the current filter or search.',
                }
              : {
                  icon: <MapPin className="size-8" aria-hidden="true" />,
                  title: 'No tax zones yet',
                  description: canManage
                    ? 'Create a tax zone for each country or region you collect tax in.'
                    : 'No tax zones have been created yet.',
                  action: canManage ? { label: 'New tax zone', onClick: openCreate } : undefined,
                }
          }
        />
      </CrudPageLayout>

      <TaxZoneFormDialog open={formOpen} onOpenChange={setFormOpen} taxZone={editingZone} />
    </div>
  );
}
