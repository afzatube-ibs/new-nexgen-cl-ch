import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Textarea, Alert } from '@nexgen/ui';
import { ConflictError, type BrandDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { useCreateBrand, useUpdateBrand } from './queries.js';

const brandSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().max(255).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  metaTitle: z.string().max(255).optional().or(z.literal('')),
  metaDescription: z.string().max(255).optional().or(z.literal('')),
});
type BrandFormValues = z.infer<typeof brandSchema>;

export interface BrandFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  brand?: BrandDTO;
}

const EMPTY_VALUES: BrandFormValues = { name: '', slug: '', description: '', metaTitle: '', metaDescription: '' };

function valuesFromBrand(brand?: BrandDTO): BrandFormValues {
  if (!brand) return EMPTY_VALUES;
  return {
    name: brand.name,
    slug: brand.slug,
    description: brand.description ?? '',
    metaTitle: brand.metaTitle ?? '',
    metaDescription: brand.metaDescription ?? '',
  };
}

/** Create/edit Brand — `catalog.brands.manage`. Logo picker deferred to Slice 2 (no Media Library UI yet). */
export function BrandFormDialog({ open, onOpenChange, brand }: BrandFormDialogProps) {
  const isEdit = Boolean(brand);
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BrandFormValues>({ resolver: zodResolver(brandSchema), defaultValues: valuesFromBrand(brand) });

  useEffect(() => {
    if (open) reset(valuesFromBrand(brand));
    setFormError(null);
  }, [open, brand, reset]);

  async function onSubmit(values: BrandFormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && brand) {
        await updateMutation.mutateAsync({ id: brand.id, input: { ...values, expectedVersion: brand.version } });
      } else {
        await createMutation.mutateAsync(values);
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This brand was changed elsewhere — close this dialog and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit brand' : 'New brand'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this brand's details." : 'Create a new brand.'}</DialogDescription>
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
          <Input label="Meta title" error={errors.metaTitle?.message} {...register('metaTitle')} />
          <Textarea label="Meta description" error={errors.metaDescription?.message} {...register('metaDescription')} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create brand'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
