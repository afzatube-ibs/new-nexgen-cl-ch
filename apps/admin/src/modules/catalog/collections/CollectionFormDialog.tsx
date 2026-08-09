import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Textarea, Alert } from '@nexgen/ui';
import { ConflictError, type CollectionDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { useCreateCollection, useUpdateCollection } from './queries.js';

const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().max(255).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});
type CollectionFormValues = z.infer<typeof collectionSchema>;

export interface CollectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: CollectionDTO;
}

const EMPTY_VALUES: CollectionFormValues = { name: '', slug: '', description: '' };

function valuesFromCollection(collection?: CollectionDTO): CollectionFormValues {
  if (!collection) return EMPTY_VALUES;
  return { name: collection.name, slug: collection.slug, description: collection.description ?? '' };
}

/** Create/edit Collection — `catalog.collections.manage`. */
export function CollectionFormDialog({ open, onOpenChange, collection }: CollectionFormDialogProps) {
  const isEdit = Boolean(collection);
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CollectionFormValues>({ resolver: zodResolver(collectionSchema), defaultValues: valuesFromCollection(collection) });

  useEffect(() => {
    if (open) reset(valuesFromCollection(collection));
    setFormError(null);
  }, [open, collection, reset]);

  async function onSubmit(values: CollectionFormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && collection) {
        await updateMutation.mutateAsync({ id: collection.id, input: { ...values, expectedVersion: collection.version } });
      } else {
        await createMutation.mutateAsync(values);
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This collection was changed elsewhere — close this dialog and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit collection' : 'New collection'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this collection's details." : 'Create a new collection.'}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Slug" hint="Leave blank to auto-generate from the name." error={errors.slug?.message} {...register('slug')} />
          <Textarea label="Description" error={errors.description?.message} {...register('description')} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create collection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
