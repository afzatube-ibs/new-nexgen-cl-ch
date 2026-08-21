/**
 * JSON-LD structured-data builders — `STORE_FRONTEND_ARCHITECTURE.md` §5's
 * own SEO requirement ("Product, BreadcrumbList, Organization... built from
 * the same ProductSummary/CategorySummary contracts... no separate
 * SEO-specific data shape"). Every builder here takes real, already-fetched
 * data and returns a plain, `JSON.stringify`-ready object — never a second
 * fetch of its own.
 */
import type { ProductDetail } from '../gateway/types.js';

export interface OrganizationSchemaInput {
  name: string;
  url: string;
  logoUrl?: string | null;
}

export function buildOrganizationSchema({ name, url, logoUrl }: OrganizationSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    ...(logoUrl ? { logo: logoUrl } : {}),
  };
}

export function buildWebsiteSchema({ name, url }: { name: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Deliberately omits `offers` (price/availability) — the real Gateway does
 * not expose evaluated pricing today (`ProductDetail` carries no price
 * field at all; `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §5 names real-time
 * Pricing/Promotions evaluation as a real, not-yet-wired dependency). A
 * `Product` schema with a fabricated or absent-but-implied price would be
 * actively misleading to a search engine and, per Google's own Merchant
 * Product schema guidance, penalizable — omitting `offers` entirely is the
 * honest choice until that data genuinely exists, not a corner cut.
 */
export function buildProductSchema(product: ProductDetail, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? product.shortDescription ?? undefined,
    sku: product.sku,
    url,
    image: product.images.map((image) => image.src),
  };
}
