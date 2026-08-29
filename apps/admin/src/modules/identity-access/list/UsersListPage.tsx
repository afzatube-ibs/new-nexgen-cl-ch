import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Pencil, Archive, Trash2, ShieldCheck } from 'lucide-react';
import { DataTable, type DataTableColumn, type DataTableSortState, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, Text } from '@nexgen/ui';
import type { UserDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { identityAccessErrorMessage } from '../shared/errors.js';
import { useUsers, useArchiveUser, useDeleteUser } from '../shared/queries.js';
import { UserFormDialog } from '../UserFormDialog.js';

type StatusFilter = 'all' | 'active' | 'archived';
const SORTABLE_COLUMN_TO_QUERY_KEY: Record<string, 'name' | 'email' | 'created_at'> = {
  name: 'name',
  email: 'email',
  created: 'created_at',
};

/**
 * Staff Users — `identity_access.users.view` (list), `.manage` (create/
 * edit/archive/delete). `UserController::index` genuinely supports
 * server-side `status`/`sort`/`direction`/real pagination (confirmed by
 * reading the controller directly) — never fetched-then-filtered
 * client-side, mirroring Customers' own `CustomersListPage` precedent.
 *
 * No free-text search — `UserController::index` has none (confirmed by
 * reading it directly, unlike `CustomerController::index`'s real `q`
 * param); offering a search box here would silently degrade to client-
 * side filtering of one page at a time, which is worse than no search at
 * all for a real staff roster.
 *
 * Row click opens the user's own detail page, where role assignment
 * lives — this list surfaces roles read-only, as a compact badge list.
 */
export function UsersListPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canManage = can('identity_access.users.manage');

  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<DataTableSortState | null>(null);
  const [page, setPage] = useState(1);

  const { data, status: queryStatus, refetch } = useUsers({
    status: status === 'all' ? undefined : status,
    sort: sort ? SORTABLE_COLUMN_TO_QUERY_KEY[sort.columnId] : undefined,
    direction: sort?.direction,
    page,
  });
  const users = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => setPage(1), [status, sort]);

  const archiveMutation = useArchiveUser();
  const deleteMutation = useDeleteUser();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | undefined>(undefined);

  function openCreate(): void {
    setEditingUser(undefined);
    setFormOpen(true);
  }

  function openEdit(user: UserDTO): void {
    setEditingUser(user);
    setFormOpen(true);
  }

  const columns: DataTableColumn<UserDTO>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', sortable: true, cell: (row) => <Text variant="body-strong">{row.name}</Text> },
      { id: 'email', header: 'Email', sortable: true, cell: (row) => row.email },
      {
        id: 'roles',
        header: 'Roles',
        cell: (row) =>
          row.roles.length === 0 ? (
            <Text variant="caption" className="text-text-secondary">
              No role assigned
            </Text>
          ) : (
            <div className="flex flex-wrap gap-1">
              {row.roles.map((role) => (
                <Badge key={role.id}>{role.label}</Badge>
              ))}
            </div>
          ),
      },
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
        id: 'actions',
        header: '',
        className: 'w-10',
        cell: (row) => (
          <RequirePermission anyOf={['identity_access.users.manage']} inline={null}>
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
                  <DropdownMenuItem
                    onSelect={() => void archiveMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}
                  >
                    <Archive className="size-4" /> Archive
                  </DropdownMenuItem>
                )}
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  }
                  title="Delete this staff account?"
                  description={`"${row.name}" will be permanently deleted and every one of their active sessions revoked immediately. This cannot be undone.`}
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => deleteMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}
                  getErrorMessage={identityAccessErrorMessage}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
        ),
      },
    ],
     
    [archiveMutation, deleteMutation],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Staff',
          description: 'Every real staff account and the role each one holds.',
          actions: (
            <RequirePermission anyOf={['identity_access.users.manage']} inline={null}>
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New staff member
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
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
          data={users}
          getRowId={(row) => row.id}
          onRowClick={(row) => void navigate(`/staff/${row.id}`)}
          sort={sort}
          onSortChange={setSort}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={
            status !== 'all'
              ? { icon: <ShieldCheck className="size-8" aria-hidden="true" />, title: 'No matching staff accounts', description: 'No staff accounts match the current filter.' }
              : {
                  icon: <ShieldCheck className="size-8" aria-hidden="true" />,
                  title: 'No staff accounts yet',
                  description: canManage ? 'Create a staff account to get started.' : 'No staff accounts exist yet.',
                  action: canManage ? { label: 'New staff member', onClick: openCreate } : undefined,
                }
          }
        />
      </CrudPageLayout>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />
    </div>
  );
}
