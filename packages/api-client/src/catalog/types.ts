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
// Product (Phase 2.2 Slice 1 — General + SEO fields only; see
// PROJECT_STATUS.md for what's deferred to Slice 2: variants, images,
// category/collection/tag/option assignment, relationships, attribute
// values, audit history)
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
