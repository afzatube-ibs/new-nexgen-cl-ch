import type { Metadata } from 'next';
import {
  GatewayRequestError,
  PromotionBanner,
  RecentlyViewedRail,
  buildOrganizationSchema,
  buildWebsiteSchema,
  getBranding,
  getContentPage,
  getHomepage,
  getProducts,
  getRecommendations,
  resolveSections,
  resolveTemplate,
  type PublishedContentPage,
} from '@nexgen/storefront-engine';
import { brandHref, categoryHref, productHref } from '@/lib/hrefs';

async function getPublishedHome(): Promise<PublishedContentPage | null> {
  try {
    return await getContentPage('home', { revalidateSeconds: 60 });
  } catch (error) {
    if (error instanceof GatewayRequestError && error.isNotFound) return null;
    throw error;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const [branding, home] = await Promise.all([getBranding({ revalidateSeconds: 60 }), getPublishedHome()]);
  return {
    title: home?.metaTitle ?? 'Home',
    description: home?.metaDescription ?? `Shop ${branding.storeName} online. Browse products, categories, brands, and new arrivals.`,
    alternates: { canonical: '/' },
  };
}

/**
 * Merchant-driven homepage. A published CMS page with slug `home` owns the
 * Section order/configuration; real catalog/recommendation data is still
 * injected server-side by key. If no home page is published, the Storefront
 * Engine's honest default template remains the launch-safe fallback.
 */
export default async function HomePage() {
  const [homepage, recentlyAdded, trending, branding, publishedHome] = await Promise.all([
    getHomepage(),
    getProducts({ sort: 'created_at', direction: 'desc', perPage: 8 }, { revalidateSeconds: 180 }),
    getRecommendations({ slot: 'trending', limit: 8 }, { revalidateSeconds: 300 }),
    getBranding({ revalidateSeconds: 60 }),
    getPublishedHome(),
  ]);

  const template = resolveTemplate('homepage');
  const sections = publishedHome?.content?.length ? publishedHome.content : template.defaultSections;
  const hasCmsHome = Boolean(publishedHome?.content?.length);

  const resolved = resolveSections({
    sections,
    data: {
      hero: hasCmsHome
        ? {}
        : {
            heading: branding.storeName,
            subheading: 'Browse products, categories, brands, and new arrivals from one trusted storefront.',
            cta: { label: 'Shop now', href: '#featured-products' },
          },
      'category-grid': {
        categories: homepage.categories.filter((category) => category.parentId === null),
        buildHref: categoryHref,
        columns: 4,
        ...(!hasCmsHome ? { heading: 'Shop by category' } : {}),
      },
      'featured-products': {
        products: homepage.products,
        buildHref: productHref,
        columns: 4,
        emptyTitle: 'No products yet',
        emptyDescription: 'Products will appear here once they are published.',
        ...(!hasCmsHome ? { heading: 'Featured products' } : {}),
      },
      'trending-products': {
        products: trending,
        buildHref: productHref,
        columns: 4,
        emptyTitle: 'Nothing trending yet',
        emptyDescription: 'Trending products will appear as shoppers explore the store.',
        ...(!hasCmsHome ? { heading: 'Trending now', description: 'Popular products based on recent storefront activity.' } : {}),
      },
      'recently-added': {
        products: recentlyAdded.data,
        buildHref: productHref,
        columns: 4,
        emptyTitle: 'No new arrivals yet',
        emptyDescription: 'Recently published products will appear here.',
        ...(!hasCmsHome ? { heading: 'Recently added' } : {}),
      },
      'brand-slider': {
        brands: homepage.brands,
        buildHref: brandHref,
        ...(!hasCmsHome ? { heading: 'Shop by brand' } : {}),
      },
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const organizationSchema = buildOrganizationSchema({ name: branding.storeName, url: siteUrl });
  const websiteSchema = buildWebsiteSchema({ name: branding.storeName, url: siteUrl });
  const announcementText = branding.announcement.enabled ? branding.announcement.text?.trim() : null;

  return (
    <div className="flex flex-col gap-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      {announcementText && <PromotionBanner heading={announcementText} tone="subtle" />}
      {resolved.map(({ key, Component, props }) =>
        key === 'featured-products' ? (
          <div key={key} id="featured-products" className="scroll-mt-24">
            <Component {...props} />
          </div>
        ) : (
          <Component key={key} {...props} />
        ),
      )}
      <RecentlyViewedRail />
    </div>
  );
}
