import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2, Lock, ShieldCheck } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Text } from '@nexgen/ui';
import type { RoleDTO } from '@nexgen/api-client';
import { CrudPageLayout, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { identityAccessErrorMessage } from '../shared/errors.js';
import { useRoles, useDeleteRole } from '../shared/queries.js';
import { RoleFormDialog } from '../RoleFormDialog.js';

/**
 * Roles — `identity_access.roles.view` (list), `.manage` (create/edit/
 * delete). `RoleController::index` (apps/backend) returns the real,
 * complete set (paginated, but a merchant's real role count is always
 * small — no search/filter offered for the same reason Customers'
 * `Audit Log` screen omits controls a real dataset this small doesn't
 * need). No detail route — a Role has no nested collection of its own
 * (unlike a Customer's address book or a User's role assignments), so
 * create/edit both live in one dialog from this list, never a separate
 * page.
 *
 * `administrator` (the seeded, real bootstrap role every fresh install's
 * first account holds — `RoleSeeder`) is shown with a lock icon and no
 * delete action: deleting it would strand a real installation with no
 * way to grant full access again short of direct database access. The
 * real backend does not itself forbid deleting it (confirmed by reading
 * `DeleteRoleAction` directly — no special-case exists) — this is a
 * client-side guardrail against a real, easy-to-regret mistake, not a
 * claim that the backend enforces it.
 */
export function RolesListPage() {
  const { data, status: queryStatus, refetch } = useRoles();
  const roles = useMemo(() => data?.data ?? [], [data]);
  const deleteMutation = useDeleteRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDTO | undefined>(undefined);

  function openCreate(): void {
    setEditingRole(undefined);
    setFormOpen(true);
  }

  function openEdit(role: RoleDTO): void {
    setEditingRole(role);
    setFormOpen(true);
  }

  const columns: DataTableColumn<RoleDTO>[] = useMemo(
    () => [
      {
        id: 'label',
        header: 'Role',
        cell: (row) => (
          <div className="flex items-center gap-1.5">
            <Text variant="body-strong">{row.label}</Text>
            {row.name === 'administrator' && <Lock className="size-3.5 text-text-secondary" aria-label="Built-in role" />}
          </div>
        ),
      },
      { id: 'name', header: 'Name', cell: (row) => <span className="font-mono text-caption text-text-secondary">{row.name}</span> },
      {
        id: 'permissions',
        header: 'Permissions',
        cell: (row) => <Badge>{row.permissions.length}</Badge>,
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
          <RequirePermission anyOf={['identity_access.roles.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.label}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openEdit(row)}>
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                {row.name !== 'administrator' && (
                  <ConfirmDialog
                    trigger={
                      <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    }
                    title="Delete this role?"
                    description={`"${row.label}" will be permanently deleted. Any staff member currently holding it will lose the access it granted immediately.`}
                    confirmLabel="Delete"
                    destructive
                    onConfirm={() => deleteMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}
                    getErrorMessage={identityAccessErrorMessage}
                  />
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
        ),
      },
    ],
     
    [deleteMutation],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Roles',
          description: 'Every real role and the permissions it grants.',
          actions: (
            <RequirePermission anyOf={['identity_access.roles.manage']} inline={null}>
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New role
              </Button>
            </RequirePermission>
          ),
        }}
      >
        <DataTable
          columns={columns}
          data={roles}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ icon: <ShieldCheck className="size-8" aria-hidden="true" />, title: 'No roles yet', description: 'Create a role to start assigning access.' }}
        />
      </CrudPageLayout>

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} role={editingRole} />
    </div>
  );
}
