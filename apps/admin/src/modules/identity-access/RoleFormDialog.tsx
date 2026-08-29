import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Checkbox, Alert, Text, Skeleton, useToast } from '@nexgen/ui';
import type { RoleDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../framework/index.js';
import { identityAccessErrorMessage } from './shared/errors.js';
import { groupPermissionsByModule } from './shared/groupPermissions.js';
import { useCreateRole, useUpdateRole, usePermissions } from './shared/queries.js';

const createSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100)
    .regex(/^[a-z0-9_-]+$/i, 'Letters, numbers, dashes, and underscores only'),
  label: z.string().min(1, 'Label is required').max(255),
});

const editSchema = z.object({
  label: z.string().min(1, 'Label is required').max(255),
});

interface FormValues {
  name?: string;
  label: string;
}

export interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  role?: RoleDTO;
}

/**
 * Create/edit a Role, including its full permission set — `identity_
 * access.roles.manage`. `name` (the machine key, e.g. `warehouse-staff`)
 * is set once at creation and never editable after — `UpdateRoleRequest`
 * has no `name` field at all (confirmed by reading it directly); only
 * `label` and `permissions` can change on an existing role.
 *
 * The permission catalog (`GET /permissions`) is real and code-registered
 * — this dialog never invents a permission key of its own, only composes
 * real ones into a role. Grouped by each permission's own real `module`
 * field, matching `PermissionController::index()`'s own
 * `orderBy('module')->orderBy('key')` — the identical grouping/order the
 * real backend already considers canonical.
 */
export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const isEdit = Boolean(role);
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const { data: permissions, status: permissionsStatus } = usePermissions();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: { name: role?.name ?? '', label: role?.label ?? '' },
  });

  useEffect(() => {
    if (open) {
      reset({ name: role?.name ?? '', label: role?.label ?? '' });
      setSelectedKeys(new Set((role?.permissions ?? []).map((p) => p.key)));
    }
    setFormError(null);
  }, [open, role, reset]);

  const groupedPermissions = useMemo(() => groupPermissionsByModule(permissions ?? []), [permissions]);

  function togglePermission(key: string, checked: boolean): void {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggleModule(moduleKeys: string[], checked: boolean): void {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const key of moduleKeys) {
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && role) {
        await updateMutation.mutateAsync({
          id: role.id,
          input: { label: values.label, permissions: [...selectedKeys], expectedVersion: role.version },
        });
        toast({ variant: 'success', title: 'Role updated', description: `"${values.label}" has been saved.` });
      } else {
        await createMutation.mutateAsync({ name: values.name ?? '', label: values.label, permissions: [...selectedKeys] });
        toast({ variant: 'success', title: 'Role created', description: `"${values.label}" has been added.` });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      setFormError(identityAccessErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit role' : 'New role'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this role's label and permissions." : 'Create a real role and choose the real permissions it grants.'}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {!isEdit && (
            <Input
              label="Name"
              hint="Machine key, e.g. warehouse-staff. Cannot be changed after creation."
              error={errors.name?.message}
              {...register('name')}
            />
          )}
          <Input label="Label" hint="Shown to staff, e.g. Warehouse Staff." error={errors.label?.message} {...register('label')} />

          <div>
            <Text variant="body-strong" className="mb-2">
              Permissions
            </Text>
            {permissionsStatus === 'pending' && (
              <div className="flex flex-col gap-2">
                <Skeleton shape="block" className="h-6 w-full" />
                <Skeleton shape="block" className="h-6 w-full" />
                <Skeleton shape="block" className="h-6 w-full" />
              </div>
            )}
            {permissionsStatus === 'error' && (
              <Text variant="body" className="text-feedback-danger">
                Couldn&rsquo;t load the real permission catalog. Close and reopen this dialog to retry.
              </Text>
            )}
            {permissionsStatus === 'success' && (
              <div className="flex flex-col gap-4 rounded-md border border-border p-3">
                {groupedPermissions.map(([moduleName, modulePermissions]) => {
                  const keys = (modulePermissions ?? []).map((p) => p.key);
                  const allChecked = keys.every((k) => selectedKeys.has(k));
                  const someChecked = !allChecked && keys.some((k) => selectedKeys.has(k));
                  return (
                    <div key={moduleName}>
                      <label className="mb-1.5 flex items-center gap-2">
                        <Checkbox
                          checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                          onCheckedChange={(checked) => toggleModule(keys, checked === true)}
                        />
                        <Text variant="body-strong" className="capitalize">
                          {moduleName.replaceAll('_', ' ')}
                        </Text>
                      </label>
                      <div className="ml-6 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {(modulePermissions ?? []).map((permission) => (
                          <label key={permission.key} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedKeys.has(permission.key)}
                              onCheckedChange={(checked) => togglePermission(permission.key, checked === true)}
                            />
                            <Text variant="body">{permission.label}</Text>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
