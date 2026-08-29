import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Archive, Trash2, Copy, Plus, X } from 'lucide-react';
import { Text, Badge, Button, Card, CardHeader, CardTitle, CardContent, Skeleton, ErrorState, Select, useToast } from '@nexgen/ui';
import { ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { identityAccessErrorMessage } from '../shared/errors.js';
import { useUser, useArchiveUser, useDeleteUser, useAssignRole, useRevokeRole, useRoles } from '../shared/queries.js';
import { UserFormDialog } from '../UserFormDialog.js';

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

function OverviewField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <Text variant="caption" className="text-text-secondary">
        {label}
      </Text>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

/**
 * Staff account detail — a dedicated route (`staff/:id`), mirroring
 * Customers' own `CustomerDetailPage` precedent: role assignment (this
 * page's own equivalent of Customers' address book) wants a real,
 * linkable surface, not a drawer.
 *
 * **Self-role-change guard**: revoking a role from the currently signed-in
 * operator's own account, on their own detail page, is disabled here —
 * a real usability protection against an accidental self-lockout (the
 * single most disruptive mistake this screen could cause), not a claim
 * that this prevents deliberate self-escalation: `identity_access.
 * user_roles.manage` itself carries no narrower scope on the real
 * backend (confirmed by reading `UserRoleController`/`AssignRoleAction`
 * directly — any holder of it can assign or revoke any role, including
 * their own, via a direct API call). Closing that gap for real is a
 * backend authorization change, out of this UI-only milestone's scope.
 */
export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: user, status: queryStatus, refetch } = useUser(id);
  const { data: rolesData } = useRoles();
  const archiveMutation = useArchiveUser();
  const destroyMutation = useDeleteUser();
  const assignMutation = useAssignRole(id ?? '');
  const revokeMutation = useRevokeRole(id ?? '');

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const isSelf = Boolean(currentUser && user && currentUser.id === user.id);

  const assignableRoles = useMemo(() => {
    const allRoles = rolesData?.data ?? [];
    const heldIds = new Set((user?.roles ?? []).map((r) => r.id));
    return allRoles.filter((role) => !heldIds.has(role.id));
  }, [rolesData, user]);

  async function handleCopyId(): Promise<void> {
    if (!user) return;
    await navigator.clipboard.writeText(user.id);
    toast({ variant: 'success', title: 'User ID copied' });
  }

  async function handleArchive(): Promise<void> {
    if (!user) return;
    try {
      await archiveMutation.mutateAsync({ id: user.id, expectedVersion: user.version });
      toast({ variant: 'success', title: 'Staff account archived' });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't archive staff account", description: identityAccessErrorMessage(error) });
    }
  }

  async function handleAssignRole(): Promise<void> {
    if (!selectedRoleId) return;
    try {
      await assignMutation.mutateAsync(selectedRoleId);
      setSelectedRoleId('');
      toast({ variant: 'success', title: 'Role assigned' });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't assign role", description: identityAccessErrorMessage(error) });
    }
  }

  async function handleRevokeRole(roleId: string): Promise<void> {
    try {
      await revokeMutation.mutateAsync(roleId);
      toast({ variant: 'success', title: 'Role revoked' });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't revoke role", description: identityAccessErrorMessage(error) });
    }
  }

  if (queryStatus === 'pending') {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton shape="block" className="h-8 w-64" />
        <Skeleton shape="block" className="h-40 w-full" />
        <Skeleton shape="block" className="h-40 w-full" />
      </div>
    );
  }

  if (queryStatus === 'error' || !user) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void navigate('/staff')}
        className="mb-3 inline-flex items-center gap-1 text-label text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Staff
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Text as="h1" variant="heading">
              {user.name}
            </Text>
            <Badge className={user.status === 'active' ? 'bg-feedback-success text-black' : undefined}>{user.status}</Badge>
            {isSelf && <Badge>You</Badge>}
          </div>
          <Text variant="body" className="mt-1 text-text-secondary">
            {user.email}
          </Text>
        </div>
        <RequirePermission anyOf={['identity_access.users.manage']} inline={null}>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            {user.status === 'active' && (
              <Button variant="outline" onClick={() => void handleArchive()}>
                <Archive className="size-4" /> Archive
              </Button>
            )}
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger">
                  <Trash2 className="size-4" /> Delete
                </Button>
              }
              title="Delete this staff account?"
              description={`"${user.name}" will be permanently deleted and every one of their active sessions revoked immediately. This cannot be undone.`}
              confirmLabel="Delete"
              destructive
              onConfirm={async () => {
                await destroyMutation.mutateAsync({ id: user.id, expectedVersion: user.version });
                void navigate('/staff');
              }}
              getErrorMessage={identityAccessErrorMessage}
            />
          </div>
        </RequirePermission>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OverviewField label="Name" value={<Text variant="body">{user.name}</Text>} />
              <OverviewField label="Email" value={<Text variant="body">{user.email}</Text>} />
              <OverviewField
                label="Status"
                value={<Badge className={user.status === 'active' ? 'bg-feedback-success text-black' : undefined}>{user.status}</Badge>}
              />
              <OverviewField label="Created" value={<Text variant="body">{formatDate(user.createdAt)}</Text>} />
              <OverviewField label="Updated" value={<Text variant="body">{formatDate(user.updatedAt)}</Text>} />
              <OverviewField
                label="User ID"
                value={
                  <div className="flex items-center gap-1.5">
                    <Text variant="body" className="truncate font-mono text-caption">
                      {user.id}
                    </Text>
                    <Button variant="ghost" size="sm" aria-label="Copy user ID" onClick={() => void handleCopyId()}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent>
            {user.roles.length === 0 ? (
              <Text variant="body" className="mb-4 text-text-secondary">
                No role assigned — this account can sign in but cannot access anything permission-gated yet.
              </Text>
            ) : (
              <div className="mb-4 flex flex-col divide-y divide-border">
                {user.roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <Text variant="body-strong">{role.label}</Text>
                      <Text variant="caption" className="text-text-secondary">
                        {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
                      </Text>
                    </div>
                    <RequirePermission anyOf={['identity_access.user_roles.manage']} inline={null}>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Revoke ${role.label}`}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot change your own role assignment here — ask another administrator.' : undefined}
                        onClick={() => void handleRevokeRole(role.id)}
                      >
                        <X className="size-4" /> Revoke
                      </Button>
                    </RequirePermission>
                  </div>
                ))}
              </div>
            )}

            <RequirePermission anyOf={['identity_access.user_roles.manage']} inline={null}>
              {isSelf ? (
                <Text variant="caption" className="text-text-secondary">
                  You cannot change your own role assignment here — ask another administrator.
                </Text>
              ) : assignableRoles.length === 0 ? (
                <Text variant="caption" className="text-text-secondary">
                  {rolesData ? 'Every real role is already assigned to this account.' : 'Loading roles…'}
                </Text>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="w-64">
                    <Select
                      label="Assign a role"
                      value={selectedRoleId}
                      onValueChange={setSelectedRoleId}
                      placeholder="Choose a role"
                      options={assignableRoles.map((role) => ({ value: role.id, label: role.label }))}
                    />
                  </div>
                  <Button onClick={() => void handleAssignRole()} disabled={!selectedRoleId} loading={assignMutation.isPending}>
                    <Plus className="size-4" /> Assign
                  </Button>
                </div>
              )}
            </RequirePermission>
          </CardContent>
        </Card>
      </div>

      <UserFormDialog open={editOpen} onOpenChange={setEditOpen} user={user} />
    </div>
  );
}
