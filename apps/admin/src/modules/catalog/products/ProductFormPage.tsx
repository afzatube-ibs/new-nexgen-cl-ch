import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Input,
  Textarea,
  Select,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingOverlay,
  Badge,
} from '@nexgen/ui';
import { ConflictError, ValidationApiError, PRODUCT_TYPES, PRODUCT_VISIBILITIES, type ProductNotReadyDetails } from '@nexgen/api-client';
import { PageHeader, ConfirmDialog, RequirePermission, applyServerValidationErrors } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { useBrands } from '../brands/queries.js';
import { useProduct, useCreateProduct, useUpdateProduct, usePublishProduct, useArchiveProduct, useRestoreProduct, useDestroyProduct } from './queries.js';

const productSchema = z.object({
  brandId: z.string().optional().or(z.literal('')),
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().max(100).optional().or(z.literal('')),
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().max(255).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  shortDescription: z.string().max(500).optional().or(z.literal('')),
  productType: z.enum(PRODUCT_TYPES),
  visibility: z.enum(PRODUCT_VISIBILITIES),
  metaTitle: z.string().max(255).optional().or(z.literal('')),
  metaDescription: z.string().max(255).optional().or(z.literal('')),
  metaKeywords: z.string().max(255).optional().or(z.literal('')),
});
type ProductFormValues = z.infer<typeof productSchema>;

const EMPTY_VALUES: ProductFormValues = {
  brandId: '',
  sku: '',
  barcode: '',
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  productType: 'simple',
  visibility: 'catalog_search',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
};

/**
 * Create/edit Product — Slice 1: General + SEO fields only
 * (`ProductResource`/`CreateProductRequest`/`UpdateProductRequest`, apps/backend).
 * Variants/Media/Organization/Relations/Attribute-values/Activity are
 * Slice 2 — no placeholder tabs shipped for them here, per Phase 2.1's own
 * "no fake placeholder UI" bar (see PROJECT_STATUS.md).
 */
export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { can } = useAuth();
  const canManage = can('catalog.products.manage');

  const { data: product, status: loadStatus } = useProduct(isNew ? undefined : id);
  const { data: brandsData } = useBrands(undefined);
  const brandOptions = useMemo(
    () => [{ value: '', label: 'No brand' }, ...(brandsData?.data ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [brandsData],
  );

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const publishMutation = usePublishProduct();
  const archiveMutation = useArchiveProduct();
  const restoreMutation = useRestoreProduct();
  const destroyMutation = useDestroyProduct();

  const [formError, setFormError] = useState<string | null>(null);
  const [publishReasons, setPublishReasons] = useState<string[] | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: EMPTY_VALUES });

  useEffect(() => {
    if (product) {
      reset({
        brandId: product.brandId ?? '',
        sku: product.sku,
        barcode: product.barcode ?? '',
        name: product.name,
        slug: product.slug,
        description: product.description ?? '',
        shortDescription: product.shortDescription ?? '',
        productType: product.productType,
        visibility: product.visibility,
        metaTitle: product.metaTitle ?? '',
        metaDescription: product.metaDescription ?? '',
        metaKeywords: product.metaKeywords ?? '',
      });
    }
  }, [product, reset]);

  function toInput(values: ProductFormValues) {
    return {
      ...values,
      brandId: values.brandId || null,
    };
  }

  async function onSubmit(values: ProductFormValues): Promise<void> {
    setFormError(null);
    try {
      if (isNew) {
        const created = await createMutation.mutateAsync(toInput(values));
        void navigate(`/catalog/products/${created.id}`, { replace: true });
      } else if (product) {
        await updateMutation.mutateAsync({ id: product.id, input: { ...toInput(values), expectedVersion: product.version } });
      }
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This product was changed elsewhere — reload the page to see the latest version before saving again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  async function handlePublish(): Promise<void> {
    if (!product) return;
    setPublishReasons(null);
    setFormError(null);
    try {
      await publishMutation.mutateAsync({ id: product.id, expectedVersion: product.version });
    } catch (error) {
      // ProductNotReadyToPublishException (422) — surfaced verbatim, per
      // publishProduct's own docblock (headless-first: the backend owns
      // this rule, the UI never re-derives it).
      if (error instanceof ValidationApiError) {
        const details = error.details as ProductNotReadyDetails | undefined;
        if (details?.reasons?.length) {
          setPublishReasons(details.reasons);
          return;
        }
      }
      if (error instanceof ConflictError) {
        setFormError('This product was changed elsewhere — reload the page and try again.');
        return;
      }
      setFormError('Could not publish this product. Please try again.');
    }
  }

  if (!isNew && loadStatus === 'pending') {
    return <LoadingOverlay label="Loading product…" />;
  }

  if (!isNew && loadStatus === 'error') {
    return <Alert variant="danger" role="alert">This product could not be loaded.</Alert>;
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'New product' : (product?.name ?? 'Product')}
        description={isNew ? 'Create a new product.' : `SKU ${product?.sku}`}
        actions={
          !isNew && product ? (
            <RequirePermission anyOf={['catalog.products.manage']} inline={null}>
              <div className="flex items-center gap-2">
                {product.status === 'draft' && (
                  <Button variant="secondary" onClick={() => void handlePublish()} loading={publishMutation.isPending}>
                    Publish
                  </Button>
                )}
                {product.status !== 'archived' ? (
                  <Button variant="secondary" onClick={() => void archiveMutation.mutateAsync({ id: product.id, expectedVersion: product.version })}>
                    Archive
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => void restoreMutation.mutateAsync(product.id)}>
                    Restore
                  </Button>
                )}
                <ConfirmDialog
                  trigger={<Button variant="destructive">Delete</Button>}
                  title="Delete this product?"
                  description={`"${product.name}" will be permanently deleted. This cannot be undone.`}
                  confirmLabel="Delete"
                  destructive
                  onConfirm={async () => {
                    await destroyMutation.mutateAsync({ id: product.id, expectedVersion: product.version });
                    void navigate('/catalog/products');
                  }}
                />
              </div>
            </RequirePermission>
          ) : undefined
        }
      />

      {product && (
        <div className="mb-4">
          <Badge variant={product.status === 'active' ? 'success' : product.status === 'archived' ? 'warning' : 'default'}>
            {product.status}
          </Badge>
        </div>
      )}

      {publishReasons && (
        <Alert variant="warning" className="mb-4" title="This product isn't ready to publish yet" role="alert">
          <ul className="list-inside list-disc">
            {publishReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Alert>
      )}
      {formError && (
        <Alert variant="danger" className="mb-4" role="alert">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" error={errors.name?.message} {...register('name')} />
              <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Barcode" error={errors.barcode?.message} {...register('barcode')} />
              <Input label="Slug" hint="Leave blank to auto-generate from the name." error={errors.slug?.message} {...register('slug')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Controller
                control={control}
                name="brandId"
                render={({ field }) => <Select label="Brand" value={field.value} onValueChange={field.onChange} options={brandOptions} />}
              />
              <Controller
                control={control}
                name="productType"
                render={({ field }) => (
                  <Select
                    label="Product type"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={PRODUCT_TYPES.map((t) => ({ value: t, label: t }))}
                  />
                )}
              />
              <Controller
                control={control}
                name="visibility"
                render={({ field }) => (
                  <Select
                    label="Visibility"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={PRODUCT_VISIBILITIES.map((v) => ({ value: v, label: v }))}
                  />
                )}
              />
            </div>
            <Textarea label="Short description" error={errors.shortDescription?.message} {...register('shortDescription')} />
            <Textarea label="Description" autoGrow error={errors.description?.message} {...register('description')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input label="Meta title" error={errors.metaTitle?.message} {...register('metaTitle')} />
            <Textarea label="Meta description" error={errors.metaDescription?.message} {...register('metaDescription')} />
            <Input label="Meta keywords" hint="Comma-separated." error={errors.metaKeywords?.message} {...register('metaKeywords')} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => void navigate('/catalog/products')}>
            Cancel
          </Button>
          <RequirePermission anyOf={['catalog.products.manage']} inline={null}>
            <Button type="submit" loading={isSubmitting || createMutation.isPending || updateMutation.isPending} disabled={!canManage}>
              {isNew ? 'Create product' : 'Save changes'}
            </Button>
          </RequirePermission>
        </div>
      </form>
    </div>
  );
}
