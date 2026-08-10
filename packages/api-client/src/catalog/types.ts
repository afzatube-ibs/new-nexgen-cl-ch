/**
 * Catalog DTOs — the exact camelCase shape of `apps/backend`'s real Catalog
 * API Resources (`Http/Resources/*Resource.php`), and the exact fields the
 * real `Create*Request`/`Update*Request` classes accept. Deliberately
 * narrower than a hypothetical "full" Product (no price/cost/weight/
 * dimensions/vendor/warranty/HS-code — none of those columns exist in this
 * backend today; see `docs/decisions/2026-08-09-catalog-headless-first-principle.md`
 * and PROJECT_STATUS.md's Phase 2.2 entry) — nothing here is speculative.
 */

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export type CatalogEntityStatus = 'active' | 'archived';

export interface BrandDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoMediaId: string | null;
  logoUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: CatalogEntityStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateBrandInput {
  name: string;
  slug?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateBrandInput extends Partial<CreateBrandInput> {
  expectedVersion: number;
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export interface CategoryDTO {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  metaTitle: string | null;
  metaDescription: string | null;
  status: CatalogEntityStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateCategoryInput {
  parentId?: string | null;
  name: string;
  slug?: string;
  description?: string;
  position?: number;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  expectedVersion: number;
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export interface CollectionDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  status: CatalogEntityStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateCollectionInput {
  name: string;
  slug?: string;
  description?: string;
  position?: number;
}

export interface UpdateCollectionInput extends Partial<CreateCollectionInput> {
  expectedVersion: number;
}

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------

export interface TagDTO {
  id: string;
  name: string;
  slug: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateTagInput {
  name: string;
  slug?: string;
}

export interface UpdateTagInput extends Partial<CreateTagInput> {
  expectedVersion: number;
}

// ---------------------------------------------------------------------------
// Attribute Group
// ---------------------------------------------------------------------------

export interface AttributeGroupDTO {
  id: string;
  code: string;
  name: string;
  position: number;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateAttributeGroupInput {
  code: string;
  name: string;
  position?: number;
}

export interface UpdateAttributeGroupInput extends Partial<CreateAttributeGroupInput> {
  expectedVersion: number;
}

// ---------------------------------------------------------------------------
// Attribute
// ---------------------------------------------------------------------------

/** `Attribute::types()`, apps/backend — the real, exhaustive enum. */
export const ATTRIBUTE_TYPES = ['text', 'number', 'boolean', 'select', 'multiselect', 'date'] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export interface AttributeDTO {
  id: string;
  attributeGroupId: string | null;
  code: string;
  name: string;
  type: AttributeType;
  isFilterable: boolean;
  position: number;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateAttributeInput {
  attributeGroupId?: string | null;
  code: string;
  name: string;
  type: AttributeType;
  isFilterable?: boolean;
  position?: number;
}

export interface UpdateAttributeInput extends Partial<CreateAttributeInput> {
  expectedVersion: number;
}

// ---------------------------------------------------------------------------
// Option / Option Value (variant dimensions)
// ---------------------------------------------------------------------------

export interface OptionValueDTO {
  id: string;
  optionId: string;
  value: string;
  slug: string;
  position: number;
}

export interface OptionDTO {
  id: string;
  code: string;
  name: string;
  position: number;
  values?: OptionValueDTO[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateOptionInput {
  code: string;
  name: string;
  position?: number;
}

export interface UpdateOptionInput extends Partial<CreateOptionInput> {
  expectedVersion: number;
}

/** Option values aren't independently versioned — every write guards the *owning Option's* `version` (`expected_option_version`, `AddOptionValueRequest`/`UpdateOptionValueRequest`/`RemoveOptionValueRequest`). */
export interface AddOptionValueInput {
  value: string;
  expectedOptionVersion: number;
}

export interface UpdateOptionValueInput {
  value: string;
  expectedOptionVersion: number;
}

// ---------------------------------------------------------------------------
// Product — the core record's own General + SEO fields (Slice 1). Its
// variants/images/relationships/category-collection-tag-option assignment/
// attribute values/audit history each have their own DTOs and endpoint
// files below and elsewhere in this folder, added in Slice 2.
// ---------------------------------------------------------------------------

/** `Product::types()`, apps/backend — the real, exhaustive enum today (no "variable"/"bundle"/"service"/"external"). */
export const PRODUCT_TYPES = ['simple', 'configurable', 'digital'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** `Product::visibilities()`, apps/backend. */
export const PRODUCT_VISIBILITIES = ['not_visible', 'catalog', 'search', 'catalog_search'] as const;
export type ProductVisibility = (typeof PRODUCT_VISIBILITIES)[number];

export interface ProductDTO {
  id: string;
  brandId: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  productType: ProductType;
  status: ProductStatus;
  visibility: ProductVisibility;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  metadata: Record<string, unknown> | null;
  publishedAt: string | null;
  /**
   * `ProductController::EAGER_LOAD` (apps/backend) always eager-loads these
   * seven relations on `GET /products/{id}` (and after every mutating
   * action on that same endpoint) — but never on `GET /products` (the list
   * endpoint has no eager-loading at all, per `ProductListItemDTO` below).
   * Optional here rather than a separate "detail" DTO, since the shape is
   * otherwise identical — undefined means "not loaded", never "empty".
   */
  categories?: CategoryDTO[];
  collections?: CollectionDTO[];
  tags?: TagDTO[];
  images?: ProductImageDTO[];
  variants?: ProductVariantDTO[];
  attributeValues?: ProductAttributeValueDTO[];
  relationships?: ProductRelationshipDTO[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateProductInput {
  brandId?: string | null;
  sku: string;
  barcode?: string;
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  productType?: ProductType;
  visibility?: ProductVisibility;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  expectedVersion: number;
}

export interface ListProductsQuery {
  status?: ProductStatus;
  visibility?: ProductVisibility;
  brandId?: string;
  categoryId?: string;
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

// ---------------------------------------------------------------------------
// Product Variant (Slice 2) — `ProductVariant`, apps/backend. Deliberately
// narrow: sku/barcode/status/position/optionValues only. No price, cost,
// weight, dimensions, or inventory columns exist on this model today —
// confirmed by reading `ProductVariant.php` and `ProductVariantResource.php`
// directly, not assumed. Pricing/Inventory remain Slice-2-honest gaps, same
// as at the Product level (see `ProductFormPage`'s Pricing/Inventory
// `PlaceholderSectionCard`s) — a future Pricing/Inventory module owns those,
// per `docs/decisions/2026-08-09-catalog-headless-first-principle.md`.
// ---------------------------------------------------------------------------

export const PRODUCT_VARIANT_STATUSES = ['active', 'archived'] as const;
export type ProductVariantStatus = (typeof PRODUCT_VARIANT_STATUSES)[number];

export interface ProductVariantDTO {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  status: ProductVariantStatus;
  position: number;
  optionValues: OptionValueDTO[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `AddProductVariantRequest`, apps/backend — `option_value_ids` must be non-empty and each must belong to an Option already assigned to the product (`SyncProductOptionsAction`), enforced server-side. */
export interface AddProductVariantInput {
  sku: string;
  barcode?: string | null;
  position?: number;
  optionValueIds: string[];
}

export interface UpdateProductVariantInput {
  sku?: string;
  barcode?: string | null;
  position?: number;
  expectedVersion: number;
}

// ---------------------------------------------------------------------------
// Product Image (Slice 2) — `ProductImage`, apps/backend. References a
// `MODULE:MEDIA` `MediaAsset` by id; the image itself carries only
// position/primary-flag. Upload happens against Media's own `POST /media`
// (see the root `media.ts`), then the returned asset id is attached here —
// two separate steps, matching the two separate aggregates.
// ---------------------------------------------------------------------------

export interface ProductImageDTO {
  id: string;
  mediaId: string;
  /** `whenLoaded('media')` on the backend — present whenever this DTO came from an endpoint that eager-loads it (every one currently does), undefined only in a hypothetical future caller that doesn't. */
  url?: string;
  altText?: string | null;
  position: number;
  isPrimary: boolean;
}

export interface AddProductImageInput {
  mediaId: string;
  position?: number;
  isPrimary?: boolean;
}

export interface UpdateProductImageInput {
  position?: number;
  isPrimary?: boolean;
}

// ---------------------------------------------------------------------------
// Product Relationship (Slice 2) — `ProductRelationship`, apps/backend.
// `ProductRelationship::types()` is the real, exhaustive list — no
// "frequently_bought_together" type exists, so that specific feature named
// in the Slice 2 brief is not implemented; see the Organization card's own
// note and the Slice 2 completion report.
// ---------------------------------------------------------------------------

export const PRODUCT_RELATIONSHIP_TYPES = ['related', 'cross_sell', 'up_sell'] as const;
export type ProductRelationshipType = (typeof PRODUCT_RELATIONSHIP_TYPES)[number];

export interface ProductRelationshipDTO {
  id: string;
  /** `ProductRelationshipResource` (apps/backend) returns only this id — no related product name/SKU/thumbnail. The UI resolves a display name itself, client-side, from an already-loaded product list, rather than fabricate one. */
  relatedProductId: string;
  type: ProductRelationshipType;
  position: number;
}

export interface AddProductRelationshipInput {
  relatedProductId: string;
  type: ProductRelationshipType;
}

// ---------------------------------------------------------------------------
// Product Attribute Value (Slice 2) — `ProductAttributeValue`, apps/backend.
// Not part of the Slice 2 brief's own explicit feature list, so no UI is
// built for this in Slice 2 — types/endpoint are added here only because
// `ProductResource`'s `attributeValues` field is always present in the
// eager-loaded detail response and the DTO needs a real shape, not `unknown`.
// ---------------------------------------------------------------------------

export interface ProductAttributeValueDTO {
  attributeId: string;
  attributeCode?: string;
  value: string | null;
}

// ---------------------------------------------------------------------------
// Catalog Audit Log (Slice 2) — `AuditLog`, apps/backend
// (`app/Domains/Commerce/Catalog/Audit/AuditLog.php`). `AuditLogController`
// filters by `actor_id`/`target_type` only — there is no `target_id` filter
// on this endpoint today. `target_type` is stored as the literal PHP FQCN
// string (`AuditLogger::log()` receives `Product::class`, which serializes
// to `"App\\Domains\\Commerce\\Catalog\\Models\\Product"`), not a short
// alias — the product Activity card filters server-side by that exact
// string and then client-side by `targetId`, since the server can't do the
// second half itself yet. Named as a real, specific backend gap, not
// silently worked around.
// ---------------------------------------------------------------------------

export const CATALOG_PRODUCT_TARGET_TYPE = 'App\\Domains\\Commerce\\Catalog\\Models\\Product';

export interface CatalogAuditLogDTO {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  correlationId: string | null;
  createdAt: string;
}

export interface ListCatalogAuditLogsQuery {
  actorId?: string;
  targetType?: string;
  page?: number;
  perPage?: number;
}

/**
 * `ProductNotReadyToPublishException` (422), apps/backend — kept as an
 * optional shape for forward-compatibility, but **not what the live
 * backend actually returns today**: the real response has no `details`
 * key at all, only a single combined sentence in `ValidationApiError`'s
 * own `message` (e.g. "...it is not assigned to at least one category.").
 * Found live (Phase 2.2A) — the earlier assumption that this exception
 * always carries `details.reasons: string[]` was wrong; `ProductFormPage`
 * now falls back to `[error.message]` when this shape isn't present,
 * which is the common case. Surfaced verbatim either way, never
 * re-derived client-side (the completeness rule stays server-owned).
 */
export interface ProductNotReadyDetails {
  reasons: string[];
}
