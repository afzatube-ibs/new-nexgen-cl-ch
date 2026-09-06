import type { MetadataRoute } from 'next';
import { buildIdSlugSegment, getBrands, getCategories, getContentPages, getProducts } from '@nexgen/storefront-engine';

/**
 * The sitemap is merchant/catalog runtime state and must not couple an
 * immutable Storefront image build to a live Gateway. It is generated when
 * requested, from the same published data customers can actually browse.
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const [categories, brands, products, pages] = await Promise.all([getCategories(), getBrands(), getProducts(), getContentPages()]);
  const pageSlugs = [...new Set(pages.map((page) => page.slug).filter((slug) => slug !== 'home'))];

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
    ...pageSlugs.map((slug) => ({
      url: `${siteUrl}/pages/${encodeURIComponent(slug)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
