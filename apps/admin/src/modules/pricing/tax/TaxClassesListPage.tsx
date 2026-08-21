import { useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Archive, Trash2, Tags } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, Text, useToast } from '@nexgen/ui';
import type { TaxClassDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { useAllTaxClasses, useArchiveTaxClass, useDestroyTaxClass } from './queries.js';
import { TaxClassFormDialog } from './TaxClassFormDialog.js';

type StatusFilter = 'all' | 'active' | 'archived';
const PAGE_SIZE = 20;

/**
 * Tax Classes — `pricing.tax.view` (list), `.manage` (create/edit/archive/
 * delete). `TaxClassController::index` (apps/backend) supports a `status`
 * filter and `page` only, hardcoded `orderBy('name')` — same "fetch the
 * complete collection, search/filter/paginate client-side" shape as
 * `TaxZonesListPage`/`PriceListsListPage`. No "Restore" action for an
 * archived class — no restore endpoint exists for any of Pricing's four
 * archivable entities.
 */
export function TaxClassesListPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('pricing.tax.manage');

  const { data: allClasses, status: queryStatus, refetch } = useAllTaxClasses();
  const classes = useMemo(() => allClasses ?? [], [allClasses]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = classes;
    if (status !== 'all') result = result.filter((c) => c.status === status);
    const term = search.trim().toLowerCase();
    if (term) result = result.filter((c) => c.name.toLowerCase().includes(term));
    return result;
  }, [classes, status, search]);

  useEffect(() => setPage(1), [search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const archiveMutation = useArchiveTaxClass();
  const destroyMutation = useDestroyTaxClass();

  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TaxClassDTO | undefined>(undefined);

  function openCreate(): void {
    setEditingClass(undefined);
    setFormOpen(true);
  }

  function openEdit(taxClass: TaxClassDTO): void {
    setEditingClass(taxClass);
    setFormOpen(true);
  }

  async function handleArchive(taxClass: TaxClassDTO): Promise<void> {
    try {
      await archiveMutation.mutateAsync({ id: taxClass.id, expectedVersion: taxClass.version });
      toast({ variant: 'success', title: 'Tax class archived', description: `"${taxClass.name}" is now archived.` });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't archive tax class", description: pricingErrorMessage(error) });
    }
  }

  const columns: DataTableColumn<TaxClassDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
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
                  title="Delete this tax class?"
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
          title: 'Tax Classes',
          description: 'Tax classifications products belong to — Standard, Reduced, Zero-Rated, Exempt, or however your jurisdictions categorize them.',
          actions: (
            <RequirePermission anyOf={['pricing.tax.manage']} inline={null}>
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New tax class
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name…"
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
                  icon: <Tags className="size-8" aria-hidden="true" />,
                  title: 'No matching tax classes',
                  description: 'No tax classes match the current filter or search.',
                }
              : {
                  icon: <Tags className="size-8" aria-hidden="true" />,
                  title: 'No tax classes yet',
                  description: canManage ? 'Create a tax class to start assigning tax rates.' : 'No tax classes have been created yet.',
                  action: canManage ? { label: 'New tax class', onClick: openCreate } : undefined,
                }
          }
        />
      </CrudPageLayout>

      <TaxClassFormDialog open={formOpen} onOpenChange={setFormOpen} taxClass={editingClass} />
    </div>
  );
}
