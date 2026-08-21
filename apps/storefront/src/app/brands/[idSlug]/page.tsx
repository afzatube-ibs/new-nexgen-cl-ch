import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GatewayRequestError, ProductGrid, buildBreadcrumbSchema, extractIdFromSegment, getBrand, getProducts } from '@nexgen/storefront-engine';
import { Text } from '@nexgen/ui';
import { productHref } from '@/lib/hrefs';

interface PageProps {
  params: Promise<{ idSlug: string }>;
}

async function loadBrand(idSlug: string) {
  const id = extractIdFromSegment(idSlug);
  try {
    return await getBrand(id);
  } catch (error) {
    if (error instanceof GatewayRequestError && (error.isNotFound || error.isUnsupportedIdentifier)) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { idSlug } = await params;
  const brand = await loadBrand(idSlug);
  return {
    title: brand.name,
    description: brand.description ?? `Shop ${brand.name} at neXgen Store.`,
    alternates: { canonical: `/brands/${idSlug}` },
  };
}

/**
 * Brand listing archetype — `STORE_FRONTEND_ARCHITECTURE.md` §1.1's
 * `/brands/[slug]` route. Deliberately does not forward the request's
 * Cookie header — see `app/page.tsx`'s own docblock for why.
 */
export default async function BrandPage({ params }: PageProps) {
  const { idSlug } = await params;
  const brand = await loadBrand(idSlug);
  const products = await getProducts({ brandId: brand.id });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: brand.name, url: `${siteUrl}/brands/${idSlug}` },
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* server-built JSON-LD, not user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <div>
        <Text as="h1" variant="display">
          {brand.name}
        </Text>
        {brand.description && (
          <Text variant="body" className="mt-2 max-w-2xl text-text-secondary">
            {brand.description}
          </Text>
        )}
      </div>
      <ProductGrid products={products.data} buildHref={productHref} columns={4} emptyTitle="No products from this brand yet" emptyDescription="Check back soon." />
    </div>
  );
}
