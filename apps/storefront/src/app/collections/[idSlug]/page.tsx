import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GatewayRequestError, ProductGrid, buildBreadcrumbSchema, extractIdFromSegment, getCollection, getProducts } from '@nexgen/storefront-engine';
import { Text } from '@nexgen/ui';
import { productHref } from '@/lib/hrefs';

interface PageProps {
  params: Promise<{ idSlug: string }>;
}

async function loadCollection(idSlug: string) {
  const id = extractIdFromSegment(idSlug);
  try {
    return await getCollection(id);
  } catch (error) {
    if (error instanceof GatewayRequestError && (error.isNotFound || error.isUnsupportedIdentifier)) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { idSlug } = await params;
  const collection = await loadCollection(idSlug);
  return {
    title: collection.name,
    description: collection.description ?? `Shop the ${collection.name} collection at neXgen Store.`,
    alternates: { canonical: `/collections/${idSlug}` },
  };
}

/**
 * Collection listing archetype — real member products, real pricing.
 *
 * neXgen Production Sprint — Milestone 2 completion: the real backend gap
 * this page's own prior version named ("`ProductController::index()` has
 * no `collection_id` filter") is closed — that filter now exists,
 * mirroring the real `category_id` filter exactly, and this page lists
 * real member products through it, identically to `brands/[idSlug]/page.
 * tsx` (same `getProducts`/`ProductGrid` call shape, same real pricing —
 * `ProductGrid` composes it internally, no page-level change needed for
 * that part). Deliberately does not forward the request's Cookie header
 * — see `app/page.tsx`'s own docblock for why.
 */
export default async function CollectionPage({ params }: PageProps) {
  const { idSlug } = await params;
  const collection = await loadCollection(idSlug);
  const products = await getProducts({ collectionId: collection.id });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: collection.name, url: `${siteUrl}/collections/${idSlug}` },
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* server-built JSON-LD, not user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <div>
        <Text as="h1" variant="display">
          {collection.name}
        </Text>
        {collection.description && (
          <Text variant="body" className="mt-2 max-w-2xl text-text-secondary">
            {collection.description}
          </Text>
        )}
      </div>
      <ProductGrid products={products.data} buildHref={productHref} columns={4} emptyTitle="No products in this collection yet" emptyDescription="Check back soon." />
    </div>
  );
}
