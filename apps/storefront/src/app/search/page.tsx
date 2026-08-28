import type { Metadata } from 'next';
import { Breadcrumb, Pagination, ProductGrid, searchProducts, toProductSummaryFromSearchResult } from '@nexgen/storefront-engine';
import { EmptyState, Text } from '@nexgen/ui';
import { productHref } from '@/lib/hrefs';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = await searchParams;
  const q = firstValue(query.q) ?? '';
  return {
    title: q ? `Search results for "${q}"` : 'Search',
    robots: { index: false, follow: true },
  };
}

/**
 * neXgen Production Sprint — Milestone 2 completion (Search UX
 * Foundation, finished). The real Gateway `GET /v1/search` route
 * (`STORE_API_GATEWAY_ARCHITECTURE.md`, already price-composed this same
 * milestone) finally has a real results page — `SearchOverlay`'s own
 * "Enter" / "See all results" both land here. Reuses `ProductGrid`
 * exactly like every other real listing page (Category/Brand/Collection)
 * — real pricing, real stock-aware Quick Add, zero duplicated rendering
 * logic — via `toProductSummaryFromSearchResult`, the one honest adapter
 * for the real search index's own narrower response shape (see that
 * function's own docblock, `gateway/types.ts`, for exactly which fields
 * are inferred from a real backend invariant vs. genuinely absent).
 *
 * An empty/missing `q` renders a real, honest "search for something"
 * prompt — never an empty grid that looks like zero products exist.
 */
export default async function SearchPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const q = (firstValue(query.q) ?? '').trim();
  const page = Number(firstValue(query.page) ?? '1') || 1;

  if (!q) {
    return (
      <div className="flex flex-col gap-6">
        <Text as="h1" variant="display">
          Search
        </Text>
        <EmptyState title="Search for something" description="Use the search icon in the header to find products by name or SKU." />
      </div>
    );
  }

  const results = await searchProducts(q, { page });
  const products = results.data.map(toProductSummaryFromSearchResult);

  function withQuery(overrides: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams({ q });
    const nextPage = overrides.page;
    if (nextPage !== undefined) params.set('page', String(nextPage));
    return `/search?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: `Search: "${q}"` }]} />
      <div>
        <Text as="h1" variant="display">
          Search results for &quot;{q}&quot;
        </Text>
        <Text as="p" variant="body" className="mt-1 text-text-secondary">
          {results.pagination?.total ?? products.length} {(results.pagination?.total ?? products.length) === 1 ? 'result' : 'results'}
        </Text>
      </div>
      <ProductGrid
        products={products}
        buildHref={productHref}
        columns={4}
        emptyTitle="No products match your search"
        emptyDescription={`We couldn't find anything for "${q}". Try a different word or check the spelling.`}
      />
      {results.pagination && results.pagination.lastPage > 1 && (
        <Pagination pagination={results.pagination} buildHref={(nextPage) => withQuery({ page: nextPage === 1 ? undefined : nextPage })} />
      )}
    </div>
  );
}
