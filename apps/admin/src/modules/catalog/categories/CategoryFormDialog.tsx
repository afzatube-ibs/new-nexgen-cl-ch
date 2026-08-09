import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Textarea, Select, Alert } from '@nexgen/ui';
import { ConflictError, type CategoryDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { useCategories, useCreateCategory, useUpdateCategory } from './queries.js';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().max(255).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  parentId: z.string().optional().or(z.literal('')),
  metaTitle: z.string().max(255).optional().or(z.literal('')),
  metaDescription: z.string().max(255).optional().or(z.literal('')),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

export interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryDTO;
}

const EMPTY_VALUES: CategoryFormValues = { name: '', slug: '', description: '', parentId: '', metaTitle: '', metaDescription: '' };

function valuesFromCategory(category?: CategoryDTO): CategoryFormValues {
  if (!category) return EMPTY_VALUES;
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    parentId: category.parentId ?? '',
    metaTitle: category.metaTitle ?? '',
    metaDescription: category.metaDescription ?? '',
  };
}

/** Create/edit Category — `catalog.categories.manage`. */
export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const isEdit = Boolean(category);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const { data: allCategories } = useCategories(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  const parentOptions = useMemo(() => {
    const options = (allCategories?.data ?? [])
      .filter((c) => c.id !== category?.id)
      .map((c) => ({ value: c.id, label: c.name }));
    return [{ value: '', label: 'No parent (top level)' }, ...options];
  }, [allCategories, category]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema), defaultValues: valuesFromCategory(category) });

  useEffect(() => {
    if (open) reset(valuesFromCategory(category));
    setFormError(null);
  }, [open, category, reset]);

  async function onSubmit(values: CategoryFormValues): Promise<void> {
    setFormError(null);
    const parentId = values.parentId || null;
    try {
      if (isEdit && category) {
        await updateMutation.mutateAsync({ id: category.id, input: { ...values, parentId, expectedVersion: category.version } });
      } else {
        await createMutation.mutateAsync({ ...values, parentId });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This category was changed elsewhere — close this dialog and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this category's details." : 'Create a new category.'}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Slug" hint="Leave blank to auto-generate from the name." error={errors.slug?.message} {...register('slug')} />
          <Controller
            control={control}
            name="parentId"
            render={({ field }) => (
              <Select label="Parent category" value={field.value} onValueChange={field.onChange} options={parentOptions} />
            )}
          />
          <Textarea label="Description" error={errors.description?.message} {...register('description')} />
          <Input label="Meta title" error={errors.metaTitle?.message} {...register('metaTitle')} />
          <Textarea label="Meta description" error={errors.metaDescription?.message} {...register('metaDescription')} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
