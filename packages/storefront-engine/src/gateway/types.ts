/**
 * Response shapes fetched from the real Store API Gateway. These mirror the
 * Gateway contracts directly; no Storefront-only commerce field is invented.
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
  parentId: string | null;
  position: number;
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: ResponsiveImage | null;
}

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface ComposedPrice {
  currencyCode: string;
  basePrice: string;
  compareAtPrice: string | null;
  salePrice: string | null;
  effectivePrice: string;
  isSaleActive: boolean;
}

/**
 * Real Inventory-owned availability. `null` on a Product means the Gateway
 * could not establish a truthful answer (for example, Inventory was down);
 * it never means "in stock".
 */
export interface ComposedAvailability {
  isAvailable: boolean;
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
  price: ComposedPrice | null;
  availability: ComposedAvailability | null;
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

export interface SearchResultSummary {
  id: string;
  name: string;
  sku: string;
  brandId: string | null;
  publishedAt: string | null;
  relevanceScore: number | null;
  price: ComposedPrice | null;
  availability: ComposedAvailability | null;
}

export function toProductSummaryFromSearchResult(result: SearchResultSummary): ProductSummary {
  return {
    id: result.id,
    name: result.name,
    slug: '',
    sku: result.sku,
    shortDescription: null,
    status: 'active',
    visibility: 'catalog_search',
    brandId: result.brandId,
    image: null,
    price: result.price,
    availability: result.availability,
  };
}

export interface HomepageData {
  categories: CategorySummary[];
  brands: BrandSummary[];
  products: ProductSummary[];
}

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
