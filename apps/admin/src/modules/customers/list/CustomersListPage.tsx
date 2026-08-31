import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Pencil, Archive, Trash2, Users } from 'lucide-react';
import { DataTable, type DataTableColumn, type DataTableSortState, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, Text, useToast } from '@nexgen/ui';
import type { CustomerDTO, CustomerStatus } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { customersErrorMessage } from '../shared/errors.js';
import { useCustomers, useArchiveCustomer, useDestroyCustomer } from '../shared/queries.js';
import { CustomerFormDialog } from '../CustomerFormDialog.js';

type StatusFilter = 'all' | CustomerStatus;
const SORTABLE_COLUMN_TO_QUERY_KEY: Record<string, 'name' | 'email' | 'created_at'> = {
  name: 'name',
  email: 'email',
  created: 'created_at',
};

/**
 * Debounces a fast-changing value (keystrokes) before it drives a network
 * lookup — duplicated locally rather than imported, matching this
 * codebase's own established "each call site owns its own copy of this
 * exact small utility" precedent (`PriceListEntryFormDialog`'s own SKU
 * lookup). `Toolbar`'s own `onSearchChange` has no debounce of its own
 * (confirmed by reading it directly) — every keystroke would otherwise
 * fire a real `GET /customers?q=` request straight through to a `LIKE`
 * query with no index-friendly prefix (`%term%`), a genuine performance
 * and merchant-workflow concern at real scale (100,000+ customers) found
 * during this module's own Freeze Audit, live-reproduced by typing a name
 * and watching one request fire per keystroke. The *input* itself still
 * updates immediately — only the query this drives is delayed.
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Customers — `customers.customers.view` (list), `.manage` (create/edit/
 * archive/delete). `CustomerController::index` (apps/backend) genuinely
 * supports server-side `q` (name/email/phone), `status`, `sort` (`name`/
 * `email`/`created_at`), `direction`, and real pagination — confirmed by
 * reading the controller and its own Feature test directly. Unlike every
 * Pricing list this engagement built, this is never fetched-then-filtered
 * client-side: every search/sort/filter/page here is a real request to the
 * real backend, matching Catalog's own Products list precedent rather than
 * Pricing's "fetch everything" workaround (which only existed because
 * Pricing's own list endpoints lacked this capability in the first place —
 * see `PHASE_2_5_CUSTOMERS_ARCHITECTURE.md` §5's own explicit note not to
 * copy that pattern here out of habit).
 *
 * "Updated" is shown but never marked sortable — `CustomerController::
 * index`'s own `$sortable` allowlist is `['name', 'email', 'created_at']`
 * only, no `updated_at` — offering a sort control the backend can't honor
 * would be dishonest, the same standard every other list in this codebase
 * already holds itself to.
 *
 * Row selection here means "click a row to open its detail" (`onRowClick`),
 * not multi-select + bulk actions — no bulk workflow is part of this
 * slice's own brief, and checkboxes with no action behind them would be
 * inventing dead UI, not a real capability.
 */
export function CustomersListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('customers.customers.manage');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<DataTableSortState | null>(null);
  const [page, setPage] = useState(1);

  const { data, status: queryStatus, refetch } = useCustomers({
    q: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    sort: sort ? SORTABLE_COLUMN_TO_QUERY_KEY[sort.columnId] : undefined,
    direction: sort?.direction,
    page,
  });
  const customers = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => setPage(1), [debouncedSearch, status, sort]);

  const archiveMutation = useArchiveCustomer();
  const destroyMutation = useDestroyCustomer();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDTO | undefined>(undefined);

  function openCreate(): void {
    setEditingCustomer(undefined);
    setFormOpen(true);
  }

  function openEdit(customer: CustomerDTO): void {
    setEditingCustomer(customer);
    setFormOpen(true);
  }

  async function handleArchive(customer: CustomerDTO): Promise<void> {
    try {
      await archiveMutation.mutateAsync({ id: customer.id, expectedVersion: customer.version });
      toast({ variant: 'success', title: 'Customer archived', description: `"${customer.name}" is now archived.` });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't archive customer", description: customersErrorMessage(error) });
    }
  }

  const columns: DataTableColumn<CustomerDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Customer', sortable: true, cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'phone', header: 'Phone', cell: (row) => row.phone ?? <span className="text-text-secondary">—</span> },
      { id: 'email', header: 'Email', sortable: true, cell: (row) => row.email ?? <span className="text-text-secondary">—</span> },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <Badge className={row.status === 'active' ? 'bg-feedback-success text-black' : undefined}>{row.status}</Badge>,
      },
      {
        id: 'created',
        header: 'Created',
        sortable: true,
        cell: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'),
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
          <RequirePermission anyOf={['customers.customers.manage']} inline={null}>
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
                  title="Delete this customer?"
                  description={`"${row.name}" and their address book will be permanently deleted. Their past orders are unaffected and will still show this customer's name and email as they were at the time of purchase.`}
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => destroyMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}
                  getErrorMessage={customersErrorMessage}
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
          title: 'Customers',
          description: 'Every registered customer account and address book.',
          actions: (
            <RequirePermission anyOf={['customers.customers.manage']} inline={null}>
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New customer
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, email, or phone…"
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
          data?.meta?.last_page ? { currentPage: data.meta.current_page ?? page, totalPages: data.meta.last_page, onPageChange: setPage } : undefined
        }
      >
        <DataTable
          columns={columns}
          data={customers}
          getRowId={(row) => row.id}
          onRowClick={(row) => void navigate(`/customers/${row.id}`)}
          sort={sort}
          onSortChange={setSort}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={
            status !== 'all' || debouncedSearch.trim()
              ? {
                  icon: <Users className="size-8" aria-hidden="true" />,
                  title: 'No matching customers',
                  description: 'No customers match the current filter or search.',
                }
              : {
                  icon: <Users className="size-8" aria-hidden="true" />,
                  title: 'No customers yet',
                  description: canManage ? 'Register a customer to get started.' : 'No customers have been registered yet.',
                  action: canManage ? { label: 'New customer', onClick: openCreate } : undefined,
                }
          }
        />
      </CrudPageLayout>

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editingCustomer} />
    </div>
  );
}
