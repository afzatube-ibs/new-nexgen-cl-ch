import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  Breadcrumb,
  FilterDrawer,
  FilterSidebar,
  GatewayRequestError,
  Pagination,
  ProductGrid,
  ProductListRow,
  ProductToolbar,
  buildBreadcrumbSchema,
  extractIdFromSegment,
  getBrands,
  getCollection,
  getProducts,
} from '@nexgen/storefront-engine';
import { Text } from '@nexgen/ui';
import { productHref } from '@/lib/hrefs';

interface PageProps {
  params: Promise<{ idSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
 * neXgen Production Sprint — Milestone 2 completion closed the real backend
 * gap this page's own prior version named (`ProductController::index()` had
 * no `collection_id` filter) — that filter now exists, mirroring the real
 * `category_id` filter exactly. Production Completion Plan v2, Milestone 9
 * closes the *second* gap the plan's own audit found live: that fix only
 * ever wired up a bare `getProducts()` call with no sort/filter/pagination
 * UI at all, unlike the sibling `categories/[idSlug]` page's own real
 * "Professional Category Page" build (Beta Milestone 2) — this page now
 * mirrors that one's real Toolbar/Pagination/URL-sync shape exactly,
 * `ProductToolbar`/`Pagination`/`FilterSidebar`/`FilterDrawer` components
 * reused unchanged. The one real difference: a Collection has no
 * sibling/child hierarchy the way a Category does (`Collection` is a flat,
 * non-nested grouping — confirmed via the Catalog model directly), so the
 * sidebar's only real filter dimension is Brand (`?brand_id=`), the same
 * one the Category page's own second filter already is.
 *
 * Deliberately does not forward the request's Cookie header — see
 * `app/page.tsx`'s own docblock for why.
 */
export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { idSlug } = await params;
  const query = await searchParams;
  const collection = await loadCollection(idSlug);

  const brandId = first(query.brand_id);
  const sort = (first(query.sort) as 'name' | 'sku' | 'created_at' | 'published_at' | undefined) ?? 'published_at';
  const direction = (first(query.direction) as 'asc' | 'desc' | undefined) ?? 'desc';
  const view = first(query.view) === 'list' ? 'list' : 'grid';
  const page = Number(first(query.page) ?? '1') || 1;
  const perPage = Number(first(query.per_page) ?? '24') || 24;

  const [productsResult, brandsResult] = await Promise.all([
    getProducts({ collectionId: collection.id, brandId, sort, direction, page, perPage }),
    getBrands(),
  ]);

  function withQuery(overrides: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams();
    if (brandId) params.set('brand_id', brandId);
    params.set('sort', sort);
    params.set('direction', direction);
    params.set('view', view);
    params.set('per_page', String(perPage));
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) params.delete(key);
      else params.set(key, String(value));
    }
    const search = params.toString();
    return search ? `/collections/${idSlug}?${search}` : `/collections/${idSlug}`;
  }

  const activeChips = brandId
    ? [{ label: brandsResult.data.find((brand) => brand.id === brandId)?.name ?? 'Brand', clearHref: withQuery({ brand_id: undefined, page: undefined }) }]
    : [];

  const filterSidebarNode = (
    <FilterSidebar
      groups={[
        {
          title: 'Brand',
          options: brandsResult.data.map((brand) => ({
            id: brand.id,
            label: brand.name,
            href: withQuery({ brand_id: brand.id === brandId ? undefined : brand.id, page: undefined }),
            active: brand.id === brandId,
          })),
        },
      ]}
      activeChips={activeChips}
      clearAllHref={activeChips.length > 0 ? withQuery({ brand_id: undefined, page: undefined }) : undefined}
    />
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: collection.name, url: `${siteUrl}/collections/${idSlug}` },
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* server-built JSON-LD, not user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: collection.name }]} />

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

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="lg:sticky lg:top-20">{filterSidebarNode}</div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <ProductToolbar
            totalCount={productsResult.pagination?.total ?? productsResult.data.length}
            sort={sort}
            direction={direction}
            view={view}
            filterSlot={<FilterDrawer activeCount={activeChips.length}>{filterSidebarNode}</FilterDrawer>}
          />

          {view === 'grid' ? (
            <ProductGrid products={productsResult.data} buildHref={productHref} columns={4} emptyTitle="No products in this collection yet" emptyDescription="Check back soon." />
          ) : productsResult.data.length === 0 ? (
            <ProductGrid products={[]} buildHref={productHref} emptyTitle="No products in this collection yet" emptyDescription="Check back soon." />
          ) : (
            <div className="flex flex-col gap-3">
              {productsResult.data.map((product) => (
                <ProductListRow key={product.id} product={product} href={productHref(product)} />
              ))}
            </div>
          )}

          {productsResult.pagination && (
            <Pagination pagination={productsResult.pagination} buildHref={(nextPage) => withQuery({ page: nextPage === 1 ? undefined : nextPage })} />
          )}
        </div>
      </div>
    </div>
  );
}
