import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GatewayRequestError, buildBreadcrumbSchema, extractIdFromSegment, getCollection } from '@nexgen/storefront-engine';
import { EmptyState, Text } from '@nexgen/ui';

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
 * Collection listing archetype. The Gateway can only return this
 * Collection's own real metadata today — its MEMBER PRODUCTS cannot be
 * listed through the Gateway yet, because the real backend's
 * `ProductController::index()` has no `collection_id` filter (unlike its
 * own `category_id` filter, which is real) — a genuine, additive backend
 * gap found during this milestone, documented in
 * `BETA_MILESTONE_1_STOREFRONT_FOUNDATION_REPORT.md`, not fabricated
 * around here. This page therefore renders a real, honest empty state for
 * its product grid — never a silently-wrong "0 products" that looks like
 * a merchandising decision rather than a known capability gap.
 * Deliberately does not forward the request's Cookie header — see
 * `app/page.tsx`'s own docblock for why.
 */
export default async function CollectionPage({ params }: PageProps) {
  const { idSlug } = await params;
  const collection = await loadCollection(idSlug);

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
      <EmptyState title="Collection browsing is coming soon" description="This collection's products aren't listable yet — a small, real backend addition is needed first (see the Beta Milestone 1 report)." />
    </div>
  );
}
