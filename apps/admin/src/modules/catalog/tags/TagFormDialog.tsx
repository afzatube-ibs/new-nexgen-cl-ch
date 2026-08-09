import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert } from '@nexgen/ui';
import { ConflictError, type TagDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { useCreateTag, useUpdateTag } from './queries.js';

const tagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().max(255).optional().or(z.literal('')),
});
type TagFormValues = z.infer<typeof tagSchema>;

export interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: TagDTO;
}

const EMPTY_VALUES: TagFormValues = { name: '', slug: '' };

function valuesFromTag(tag?: TagDTO): TagFormValues {
  if (!tag) return EMPTY_VALUES;
  return { name: tag.name, slug: tag.slug };
}

/** Create/edit Tag — `catalog.tags.manage`. No `status` column — Tags have no archive action, `destroy`/`restore` only. */
export function TagFormDialog({ open, onOpenChange, tag }: TagFormDialogProps) {
  const isEdit = Boolean(tag);
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TagFormValues>({ resolver: zodResolver(tagSchema), defaultValues: valuesFromTag(tag) });

  useEffect(() => {
    if (open) reset(valuesFromTag(tag));
    setFormError(null);
  }, [open, tag, reset]);

  async function onSubmit(values: TagFormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && tag) {
        await updateMutation.mutateAsync({ id: tag.id, input: { ...values, expectedVersion: tag.version } });
      } else {
        await createMutation.mutateAsync(values);
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This tag was changed elsewhere — close this dialog and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit tag' : 'New tag'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this tag's details." : 'Create a new tag.'}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Slug" hint="Leave blank to auto-generate from the name." error={errors.slug?.message} {...register('slug')} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create tag'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
