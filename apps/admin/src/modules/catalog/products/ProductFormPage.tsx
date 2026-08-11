import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Tag, Boxes, FolderTree } from 'lucide-react';
import {
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
  Text,
} from '@nexgen/ui';
import { ConflictError, ValidationApiError, PRODUCT_TYPES, PRODUCT_VISIBILITIES, type ProductNotReadyDetails } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { useAllBrands } from '../brands/queries.js';
import { useProduct, useCreateProduct, useUpdateProduct, usePublishProduct, useArchiveProduct, useRestoreProduct, useDestroyProduct } from './queries.js';
import { StickyActionBar } from './editor/StickyActionBar.js';
import { CompletionChecklist } from './editor/CompletionChecklist.js';
import { PlaceholderSectionCard } from './editor/PlaceholderSectionCard.js';
import { AiReserveButton } from './editor/AiReserveButton.js';
import { RichTextToolbar } from './editor/RichTextToolbar.js';
import { slugify } from './editor/slug.js';
import { MediaManagerCard } from './editor/media/MediaManagerCard.js';
import { VariantsCard } from './editor/variants/VariantsCard.js';
import { OrganizationCard } from './editor/organization/OrganizationCard.js';
import { RelatedProductsCard } from './editor/organization/RelatedProductsCard.js';
import { ActivityCard } from './editor/activity/ActivityCard.js';

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

interface DuplicateState {
  duplicateFrom?: ProductFormValues & { sourceName: string };
}

/**
 * Create/edit Product — Phase 2.2A's redesigned layout (see
 * `PHASE_2_2A_PRODUCT_EDITOR_UX_REPORT.md` for that research/decision
 * record), now filled in with Slice 2's real Variants/Media/Organization/
 * Activity — the General + SEO form fields on this page itself are still
 * exactly `ProductResource`/`Create`/`UpdateProductRequest` (apps/backend);
 * the sub-cards below call their own separate endpoints directly (see each
 * card's own file), not this component's form submit.
 */
export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { can } = useAuth();
  const canManage = can('catalog.products.manage');

  const { data: product, status: loadStatus } = useProduct(isNew ? undefined : id);
  const { data: allBrands } = useAllBrands();
  const brandOptions = useMemo(
    () => [{ value: '', label: 'No brand' }, ...(allBrands ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [allBrands],
  );

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const publishMutation = usePublishProduct();
  const archiveMutation = useArchiveProduct();
  const restoreMutation = useRestoreProduct();
  const destroyMutation = useDestroyProduct();

  const [formError, setFormError] = useState<string | null>(null);
  const [publishReasons, setPublishReasons] = useState<string[] | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: EMPTY_VALUES });

  // Editing an existing product — hydrate the form from the server once it loads.
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

  // Duplicate — a purely client-side prefill (`StickyActionBar`'s
  // "Duplicate" navigates here with router state), never a new backend
  // endpoint. Cleared from history state after use so a later plain visit
  // to /new isn't accidentally pre-filled by a stale navigation.
  useEffect(() => {
    if (isNew) {
      const duplicateFrom = (location.state as DuplicateState | null)?.duplicateFrom;
      if (duplicateFrom) {
        const { sourceName: _sourceName, ...values } = duplicateFrom;
        reset(values);
        void navigate(location.pathname, { replace: true, state: null });
      }
    }
    // Only ever run once, on mount, for the initial duplicate-prefill — not on every location change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn on an actual tab close/refresh with unsaved changes — the one
  // guard that needs a real browser-level hook, not just in-app UI (the
  // in-app Cancel path is guarded separately, below, via a confirm dialog).
  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      if (isDirty) event.preventDefault();
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  function toInput(values: ProductFormValues) {
    return { ...values, brandId: values.brandId || null };
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

  // Ctrl/Cmd+S — Linear's "keyboard is the primary interface" principle,
  // with the shortcut visibly printed on the Save button itself rather
  // than hidden.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (canManage) void handleSubmit(onSubmit)();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, product]);

  async function handlePublish(): Promise<void> {
    if (!product) return;
    setPublishReasons(null);
    setFormError(null);
    try {
      await publishMutation.mutateAsync({ id: product.id, expectedVersion: product.version });
    } catch (error) {
      // ProductNotReadyToPublishException (422) — surfaced verbatim, per
      // publishProduct's own docblock (headless-first: the backend owns
      // this rule, the UI never re-derives it — CompletionChecklist below
      // only *previews* the same rule, it doesn't replace this). The real
      // response body observed against the live backend is a single
      // combined sentence in `message` (e.g. "...it is not assigned to at
      // least one category."), NOT a `details.reasons` array — a real bug
      // found here, live: this code previously checked `details.reasons`
      // only, so it silently fell through to a generic error and never
      // showed the backend's actual reason. Handling both shapes now, in
      // case a future backend change adds the structured array back.
      if (error instanceof ValidationApiError) {
        const details = error.details as ProductNotReadyDetails | undefined;
        if (details?.reasons?.length) {
          setPublishReasons(details.reasons);
          return;
        }
        setPublishReasons([error.message]);
        return;
      }
      if (error instanceof ConflictError) {
        setFormError('This product was changed elsewhere — reload the page and try again.');
        return;
      }
      setFormError('Could not publish this product. Please try again.');
    }
  }

  // `StickyActionBar` itself wraps this in a discard-confirmation dialog
  // when there are unsaved changes (`isDirty`, passed down) — this
  // function is the "actually leave" action either way.
  function handleCancel(): void {
    void navigate('/catalog/products');
  }

  function handleDuplicate(): void {
    if (!product) return;
    const values = getValues();
    void navigate('/catalog/products/new', {
      state: {
        duplicateFrom: {
          ...values,
          name: `${values.name} (copy)`,
          sku: '',
          slug: '',
          sourceName: values.name,
        },
      },
    });
  }

  const watchedName = watch('name');
  const watchedSlug = watch('slug');
  const watchedProductType = watch('productType');
  const watchedSku = watch('sku');
  const slugPreview = watchedName ? slugify(watchedName) : '';

  if (!isNew && loadStatus === 'pending') {
    return <LoadingOverlay label="Loading product…" />;
  }

  if (!isNew && loadStatus === 'error') {
    return (
      <Alert variant="danger" role="alert">
        This product could not be loaded.
      </Alert>
    );
  }

  const statusBadge = product ? (
    <Badge variant={product.status === 'active' ? 'success' : product.status === 'archived' ? 'warning' : 'default'}>
      {product.status}
    </Badge>
  ) : undefined;

  return (
    <div>
      <StickyActionBar
        title={isNew ? 'New product' : (product?.name ?? 'Product')}
        subtitle={isNew ? 'Create a new product.' : `SKU ${product?.sku}`}
        statusBadge={statusBadge}
        isNew={isNew}
        isDirty={isDirty}
        canManage={canManage}
        saving={isSubmitting || createMutation.isPending || updateMutation.isPending}
        onSave={() => void handleSubmit(onSubmit)()}
        onCancel={handleCancel}
        showPublish={Boolean(product && product.status === 'draft')}
        publishing={publishMutation.isPending}
        onPublish={() => void handlePublish()}
        isArchived={product?.status === 'archived'}
        onArchive={() => product && void archiveMutation.mutateAsync({ id: product.id, expectedVersion: product.version })}
        onRestore={() => product && void restoreMutation.mutateAsync(product.id)}
        onDuplicate={handleDuplicate}
        onDelete={async () => {
          if (!product) return;
          await destroyMutation.mutateAsync({ id: product.id, expectedVersion: product.version });
          void navigate('/catalog/products');
        }}
        productName={product?.name ?? ''}
      />

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

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column — content that changes often: Identity, Media,
            Pricing, Inventory, Variants, Description, SEO, Advanced. Wide,
            since these are the fields a merchant edits most. */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Identity</CardTitle>
              <AiReserveButton label="Improve Title" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Name" error={errors.name?.message} {...register('name')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="SKU" hint="Must be unique across the catalog." error={errors.sku?.message} {...register('sku')} />
                <Input label="Barcode" error={errors.barcode?.message} {...register('barcode')} />
              </div>
              <div>
                <Input label="Slug" error={errors.slug?.message} {...register('slug')} />
                {!watchedSlug && slugPreview && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Text variant="caption" className="text-text-secondary">
                      Preview: <code className="text-code">/products/{slugPreview}</code> — left blank, the server generates this automatically.
                    </Text>
                    <button
                      type="button"
                      className="text-caption font-medium text-brand hover:underline"
                      onClick={() => setValue('slug', slugPreview, { shouldDirty: true })}
                    >
                      Use this
                    </button>
                  </div>
                )}
              </div>
              <Controller
                control={control}
                name="brandId"
                render={({ field }) => <Select label="Brand" value={field.value} onValueChange={field.onChange} options={brandOptions} />}
              />
            </CardContent>
          </Card>

          <MediaManagerCard productId={product?.id} canManage={canManage} />
          <PlaceholderSectionCard
            title="Pricing"
            icon={<Tag className="size-8" aria-hidden="true" />}
            description="Price, cost, and tax fields belong to the future Pricing module — not yet built, and deliberately not owned by Catalog."
          />
          <PlaceholderSectionCard
            title="Inventory"
            icon={<Boxes className="size-8" aria-hidden="true" />}
            description="Stock levels and warehouse allocation belong to the future Inventory module — not yet built, and deliberately not owned by Catalog."
          />
          {product && <VariantsCard product={product} canManage={canManage} />}

          <Card>
            <CardHeader className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Description</CardTitle>
              <div className="flex flex-wrap items-center gap-1">
                <AiReserveButton label="Generate Description" />
                <AiReserveButton label="Marketing Copy" />
                <AiReserveButton label="Translate" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea
                label="Short description"
                hint="A one- or two-sentence summary shown in listings and search results."
                error={errors.shortDescription?.message}
                {...register('shortDescription')}
              />
              <div>
                <RichTextToolbar textareaRef={descriptionRef} value={watch('description') ?? ''} onChange={(next) => setValue('description', next, { shouldDirty: true })} />
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <Textarea
                      label="Description"
                      autoGrow
                      error={errors.description?.message}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={(el) => {
                        field.ref(el);
                        descriptionRef.current = el;
                      }}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>SEO</CardTitle>
              <AiReserveButton label="Generate SEO" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Meta title" error={errors.metaTitle?.message} {...register('metaTitle')} />
              <Textarea label="Meta description" error={errors.metaDescription?.message} {...register('metaDescription')} />
              <Input label="Meta keywords" hint="Comma-separated." error={errors.metaKeywords?.message} {...register('metaKeywords')} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced</CardTitle>
            </CardHeader>
            <CardContent>
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
              <Text variant="caption" className="mt-2 text-text-secondary">
                A structural choice, rarely changed after creation. &ldquo;Configurable&rdquo; products require at least one
                variant to publish (see Variants, above).
              </Text>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — glanceable status/meta, changed rarely: Status &
            Visibility (with the real publish-completeness checklist),
            Organization, Related products, and Activity. Narrow, on
            purpose (Shopify/Medusa's convergent pattern — see the UX
            report's research notes). */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status &amp; visibility</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Text variant="body-strong" className="mb-1.5">
                  Status
                </Text>
                {statusBadge ?? (
                  <Text variant="caption" className="text-text-secondary">
                    Set once created.
                  </Text>
                )}
              </div>
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
              <div className="border-t border-border pt-4">
                <Text variant="body-strong" className="mb-2">
                  Ready to publish?
                </Text>
                <CompletionChecklist
                  name={watchedName}
                  sku={watchedSku}
                  productType={watchedProductType}
                  isNew={isNew}
                  categoryCount={product?.categories?.length ?? 0}
                  variantCount={product?.variants?.length ?? 0}
                />
              </div>
            </CardContent>
          </Card>

          {product ? (
            <>
              <OrganizationCard product={product} canManage={canManage} />
              <RelatedProductsCard product={product} canManage={canManage} />
              <ActivityCard productId={product.id} />
            </>
          ) : (
            <PlaceholderSectionCard
              title="Organization"
              icon={<FolderTree className="size-8" aria-hidden="true" />}
              description="Categories, collections, tags, and related products can be assigned once this product has been created."
            />
          )}
        </div>
      </form>
    </div>
  );
}
