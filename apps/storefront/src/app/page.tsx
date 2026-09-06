import type { Metadata } from 'next';
import {
  PromotionBanner,
  RecentlyViewedRail,
  buildOrganizationSchema,
  buildWebsiteSchema,
  getBranding,
  getHomepage,
  getProducts,
  getRecommendations,
  resolveSections,
  resolveTemplate,
} from '@nexgen/storefront-engine';
import { brandHref, categoryHref, productHref } from '@/lib/hrefs';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding({ revalidateSeconds: 60 });
  return {
    title: 'Home',
    description: `Shop ${branding.storeName} online. Browse products, categories, brands, and new arrivals.`,
    alternates: { canonical: '/' },
  };
}

/**
 * Storefront homepage.
 *
 * Until the CMS/Homepage Builder is implemented, the Storefront Engine's
 * default homepage template remains the structural fallback. Merchant-facing
 * identity must still come from the real published branding endpoint: no
 * hard-coded store name, invented campaign, or fake promotion should leak
 * into the customer experience.
 */
export default async function HomePage() {
  const [homepage, recentlyAdded, trending, branding] = await Promise.all([
    getHomepage(),
    getProducts({ sort: 'created_at', direction: 'desc', perPage: 8 }, { revalidateSeconds: 180 }),
    getRecommendations({ slot: 'trending', limit: 8 }, { revalidateSeconds: 300 }),
    getBranding({ revalidateSeconds: 60 }),
  ]);

  const template = resolveTemplate('homepage');
  const resolved = resolveSections({
    sections: template.defaultSections,
    data: {
      hero: {
        heading: branding.storeName,
        subheading: 'Browse products, categories, brands, and new arrivals from one trusted storefront.',
        cta: { label: 'Shop now', href: '#featured-products' },
      },
      'category-grid': {
        categories: homepage.categories.filter((category) => category.parentId === null),
        buildHref: categoryHref,
        columns: 4,
        heading: 'Shop by category',
      },
      'featured-products': {
        products: homepage.products,
        buildHref: productHref,
        columns: 4,
        heading: 'Featured products',
        emptyTitle: 'No products yet',
        emptyDescription: 'Products will appear here once they are published.',
      },
      'trending-products': {
        products: trending,
        buildHref: productHref,
        columns: 4,
        heading: 'Trending now',
        description: 'Popular products based on recent storefront activity.',
        emptyTitle: 'Nothing trending yet',
        emptyDescription: 'Trending products will appear as shoppers explore the store.',
      },
      'recently-added': {
        products: recentlyAdded.data,
        buildHref: productHref,
        columns: 4,
        heading: 'Recently added',
        emptyTitle: 'No new arrivals yet',
        emptyDescription: 'Recently published products will appear here.',
      },
      'brand-slider': { brands: homepage.brands, buildHref: brandHref, heading: 'Shop by brand' },
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const organizationSchema = buildOrganizationSchema({ name: branding.storeName, url: siteUrl });
  const websiteSchema = buildWebsiteSchema({ name: branding.storeName, url: siteUrl });

  const [heroSection, ...restSections] = resolved;
  const announcementText = branding.announcement.enabled ? branding.announcement.text?.trim() : null;

  return (
    <div className="flex flex-col gap-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      {heroSection && <heroSection.Component {...heroSection.props} />}
      {announcementText && <PromotionBanner heading={announcementText} tone="subtle" />}
      {restSections.map(({ key, Component, props }) =>
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
