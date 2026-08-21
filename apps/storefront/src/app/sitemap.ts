import type { MetadataRoute } from 'next';
import { buildIdSlugSegment, getBrands, getCategories, getProducts } from '@nexgen/storefront-engine';

/**
 * `STORE_FRONTEND_ARCHITECTURE.md` §5 — "generated at build/revalidation
 * time from the BFF's own paginated product/category/CMS-page listing,
 * never hand-maintained." No CMS Pages exist yet (M2) to include.
 *
 * Fetches one real page per entity (the Gateway's own default `per_page`)
 * — genuinely correct for this milestone's real catalog size; a store
 * with enough products to need multi-page sitemap generation is real,
 * future work (Next.js's own `generateSitemaps` multi-file convention is
 * the documented mechanism for that, not invented here) named rather than
 * silently capped without comment.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const [categories, brands, products] = await Promise.all([getCategories(), getBrands(), getProducts()]);

  return [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    ...categories.data.map((category) => ({
      url: `${siteUrl}/categories/${buildIdSlugSegment(category.id, category.name)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...brands.data.map((brand) => ({
      url: `${siteUrl}/brands/${buildIdSlugSegment(brand.id, brand.name)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...products.data.map((product) => ({
      url: `${siteUrl}/products/${buildIdSlugSegment(product.id, product.name)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
