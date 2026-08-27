/**
 * Response shapes this package fetches from the real Store API Gateway
 * (`apps/store-api-gateway`) — a direct mirror of that service's own
 * `src/composition/mappers.ts` / `src/lib/responseEnvelope.ts` output,
 * confirmed by direct code read (not guessed), per this milestone's own
 * "Everything must consume the Gateway" rule. Nothing here invents a field
 * the Gateway does not actually return.
 */

export interface ResponsiveImage {
  src: string;
  srcSet: Array<{ width: number; url: string }>;
  alt: string;
}

export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface GatewayEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
    cache?: 'HIT' | 'MISS' | 'STALE';
    pagination?: PaginationMeta;
  };
}

export interface GatewayErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string }>;
  };
  meta: { requestId: string };
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: ResponsiveImage | null;
  /** Real backend field, added Beta Milestone 2 for mega-menu hierarchy — `null` for a top-level category. */
  parentId: string | null;
  /** Real backend field (merchant-configured display order) — used for nav/menu ordering. */
  position: number;
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: ResponsiveImage | null;
}

/**
 * Real metadata only. The Gateway has no way to list a Collection's own
 * member products today — `ProductController::index()` on the real
 * backend supports `category_id` but not `collection_id`
 * (`apps/store-api-gateway/src/composition/mappers.ts`'s own
 * `CollectionSummary` docblock) — a genuine, additive backend gap, named
 * in `BETA_MILESTONE_1_STOREFRONT_FOUNDATION_REPORT.md`, not fixed here.
 */
export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  status: string;
  visibility: string;
  brandId: string | null;
  image: ResponsiveImage | null;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  productType: string;
  metaTitle: string | null;
  metaDescription: string | null;
  images: ResponsiveImage[];
  categories: CategorySummary[];
  publishedAt: string | null;
}

export interface HomepageData {
  categories: CategorySummary[];
  brands: BrandSummary[];
  products: ProductSummary[];
}

/** `GET /v1/branding` (`apps/store-api-gateway/src/routes/branding.ts`) — mirrors that route's own real `StorefrontBranding` shape exactly. */
export interface StorefrontBranding {
  storeName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  logo: { url: string; alt: string } | null;
  favicon: { url: string } | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  typographyPreset: string;
  buttonStyle: 'solid' | 'outline' | 'soft';
  announcement: { enabled: boolean; text: string | null };
  social: {
    whatsappNumber: string | null;
    messengerUrl: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
  };
}
