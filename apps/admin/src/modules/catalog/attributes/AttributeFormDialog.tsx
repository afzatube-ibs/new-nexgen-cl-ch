import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Select, Checkbox, Alert } from '@nexgen/ui';
import { ConflictError, ATTRIBUTE_TYPES, type AttributeDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { useAttributeGroups } from '../attributeGroups/queries.js';
import { useCreateAttribute, useUpdateAttribute } from './queries.js';

const schema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code may only contain letters, numbers, dashes, and underscores'),
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(ATTRIBUTE_TYPES),
  attributeGroupId: z.string().optional().or(z.literal('')),
  isFilterable: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export interface AttributeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute?: AttributeDTO;
}

const EMPTY_VALUES: FormValues = { code: '', name: '', type: 'text', attributeGroupId: '', isFilterable: false };

function valuesFromEntity(entity?: AttributeDTO): FormValues {
  if (!entity) return EMPTY_VALUES;
  return {
    code: entity.code,
    name: entity.name,
    type: entity.type,
    attributeGroupId: entity.attributeGroupId ?? '',
    isFilterable: entity.isFilterable,
  };
}

/** Create/edit Attribute — `catalog.attributes.manage`. No `status` column. */
export function AttributeFormDialog({ open, onOpenChange, attribute }: AttributeFormDialogProps) {
  const isEdit = Boolean(attribute);
  const createMutation = useCreateAttribute();
  const updateMutation = useUpdateAttribute();
  const { data: groupsData } = useAttributeGroups(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  const groupOptions = useMemo(() => {
    const options = (groupsData?.data ?? []).map((g) => ({ value: g.id, label: g.name }));
    return [{ value: '', label: 'No group' }, ...options];
  }, [groupsData]);

  const typeOptions = useMemo(() => ATTRIBUTE_TYPES.map((t) => ({ value: t, label: t[0]!.toUpperCase() + t.slice(1) })), []);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromEntity(attribute) });

  useEffect(() => {
    if (open) reset(valuesFromEntity(attribute));
    setFormError(null);
  }, [open, attribute, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const attributeGroupId = values.attributeGroupId || null;
    try {
      if (isEdit && attribute) {
        await updateMutation.mutateAsync({ id: attribute.id, input: { ...values, attributeGroupId, expectedVersion: attribute.version } });
      } else {
        await createMutation.mutateAsync({ ...values, attributeGroupId });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This attribute was changed elsewhere — close this dialog and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit attribute' : 'New attribute'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this attribute's details." : 'Create a new attribute.'}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Code" hint="A unique machine-readable identifier." error={errors.code?.message} {...register('code')} />
          <Controller
            control={control}
            name="type"
            render={({ field }) => <Select label="Type" value={field.value} onValueChange={field.onChange} options={typeOptions} />}
          />
          <Controller
            control={control}
            name="attributeGroupId"
            render={({ field }) => (
              <Select label="Attribute group" value={field.value} onValueChange={field.onChange} options={groupOptions} />
            )}
          />
          <Controller
            control={control}
            name="isFilterable"
            render={({ field }) => (
              <Checkbox
                label="Filterable in storefront search"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create attribute'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
