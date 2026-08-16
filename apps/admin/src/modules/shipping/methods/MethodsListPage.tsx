import { useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Archive, Trash2, Truck } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, Text, useToast } from '@nexgen/ui';
import type { ShippingMethodDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { shippingErrorMessage } from '../shared/errors.js';
import { useAllShippingMethods, useArchiveShippingMethod, useDestroyShippingMethod } from '../shared/queries.js';
import { MethodFormDialog } from './MethodFormDialog.js';

type StatusFilter = 'all' | 'active' | 'archived';
const PAGE_SIZE = 20;

/**
 * Shipping Methods — `shipping.methods.view` (list), `.manage` (create/
 * edit/archive/delete). `ShippingMethodController::index` (apps/backend)
 * supports `status` and `page` only, hardcoded `orderBy('name')` — same
 * "fetch once, filter client-side" shape as `ZonesListPage`.
 *
 * `providerCode` is a real courier identifier (`manual`, `steadfast`,
 * `pathao`, `redx`, `paperfly`, `sundarban`, `ecourier`) OR null for a
 * self-fulfilled method (`ShippingMethod::isSelfFulfilled()`), but this
 * slice does not offer a picker sourced from the real Courier Registry
 * (`GET /shipping/providers`) — that endpoint is read-only visibility this
 * slice's own approved scope did not ask for building a page around,
 * confirmed against `PHASE_2_8_SHIPPING_ARCHITECTURE.md`'s own explicit
 * Slice 1 item list. A free-text field is used instead (see
 * `MethodFormDialog`'s own docblock), never invented business logic.
 */
export function MethodsListPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('shipping.methods.manage');

  const { data: allMethods, status: queryStatus, refetch } = useAllShippingMethods();
  const methods = useMemo(() => allMethods ?? [], [allMethods]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = methods;
    if (status !== 'all') result = result.filter((m) => m.status === status);
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (m) => m.name.toLowerCase().includes(term) || m.code.toLowerCase().includes(term) || (m.providerCode ?? '').toLowerCase().includes(term),
      );
    }
    return result;
  }, [methods, status, search]);

  useEffect(() => setPage(1), [search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const archiveMutation = useArchiveShippingMethod();
  const destroyMutation = useDestroyShippingMethod();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethodDTO | undefined>(undefined);

  function openCreate(): void {
    setEditingMethod(undefined);
    setFormOpen(true);
  }

  function openEdit(method: ShippingMethodDTO): void {
    setEditingMethod(method);
    setFormOpen(true);
  }

  async function handleArchive(method: ShippingMethodDTO): Promise<void> {
    try {
      await archiveMutation.mutateAsync({ id: method.id, expectedVersion: method.version });
      toast({ variant: 'success', title: 'Shipping method archived', description: `"${method.name}" is now archived.` });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't archive shipping method", description: shippingErrorMessage(error) });
    }
  }

  const columns: DataTableColumn<ShippingMethodDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'code', header: 'Code', cell: (row) => <span className="font-mono text-caption">{row.code}</span> },
      {
        id: 'provider',
        header: 'Courier',
        cell: (row) => (row.providerCode ? <span className="tabular-nums">{row.providerCode}</span> : <span className="text-text-secondary">Self-fulfilled</span>),
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
          <RequirePermission anyOf={['shipping.methods.manage']} inline={null}>
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
                  title="Delete this shipping method?"
                  description={`"${row.name}" will be permanently deleted. This cannot be undone.`}
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
    [destroyMutation],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Shipping Methods',
          description: 'Named service levels a merchant offers — e.g. Standard, Express, Store Pickup — each optionally tied to a courier.',
          actions: (
            <RequirePermission anyOf={['shipping.methods.manage']} inline={null}>
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New method
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, code, or courier…"
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
                  icon: <Truck className="size-8" aria-hidden="true" />,
                  title: 'No matching shipping methods',
                  description: 'No shipping methods match the current filter or search.',
                }
              : {
                  icon: <Truck className="size-8" aria-hidden="true" />,
                  title: 'No shipping methods yet',
                  description: canManage ? 'Create a service level, e.g. Standard or Express.' : 'No shipping methods have been created yet.',
                  action: canManage ? { label: 'New method', onClick: openCreate } : undefined,
                }
          }
        />
      </CrudPageLayout>

      <MethodFormDialog open={formOpen} onOpenChange={setFormOpen} method={editingMethod} />
    </div>
  );
}
