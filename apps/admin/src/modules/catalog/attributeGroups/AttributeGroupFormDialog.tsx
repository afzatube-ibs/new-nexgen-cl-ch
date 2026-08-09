import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert } from '@nexgen/ui';
import { ConflictError, type AttributeGroupDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { useCreateAttributeGroup, useUpdateAttributeGroup } from './queries.js';

const schema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code may only contain letters, numbers, dashes, and underscores'),
  name: z.string().min(1, 'Name is required').max(255),
});
type FormValues = z.infer<typeof schema>;

export interface AttributeGroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attributeGroup?: AttributeGroupDTO;
}

const EMPTY_VALUES: FormValues = { code: '', name: '' };

function valuesFromEntity(entity?: AttributeGroupDTO): FormValues {
  if (!entity) return EMPTY_VALUES;
  return { code: entity.code, name: entity.name };
}

/** Create/edit Attribute Group — `catalog.attributes.manage` (shared with Attributes). No `status` column. */
export function AttributeGroupFormDialog({ open, onOpenChange, attributeGroup }: AttributeGroupFormDialogProps) {
  const isEdit = Boolean(attributeGroup);
  const createMutation = useCreateAttributeGroup();
  const updateMutation = useUpdateAttributeGroup();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromEntity(attributeGroup) });

  useEffect(() => {
    if (open) reset(valuesFromEntity(attributeGroup));
    setFormError(null);
  }, [open, attributeGroup, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && attributeGroup) {
        await updateMutation.mutateAsync({ id: attributeGroup.id, input: { ...values, expectedVersion: attributeGroup.version } });
      } else {
        await createMutation.mutateAsync(values);
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This attribute group was changed elsewhere — close this dialog and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit attribute group' : 'New attribute group'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this group's details." : 'Create a new attribute group.'}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Code" hint="A unique machine-readable identifier." error={errors.code?.message} {...register('code')} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
