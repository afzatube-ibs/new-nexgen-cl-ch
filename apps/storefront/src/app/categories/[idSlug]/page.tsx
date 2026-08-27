import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  Breadcrumb,
  CategoryBanner,
  FilterDrawer,
  FilterSidebar,
  GatewayRequestError,
  Pagination,
  ProductGrid,
  ProductListRow,
  ProductToolbar,
  PromotionBanner,
  RecentlyViewedRail,
  buildBreadcrumbSchema,
  extractIdFromSegment,
  getBrands,
  getCategories,
  getCategory,
  getProducts,
  getRecommendations,
  type CategorySummary,
} from '@nexgen/storefront-engine';
import { categoryHref, productHref } from '@/lib/hrefs';

interface PageProps {
  params: Promise<{ idSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function loadCategory(idSlug: string) {
  const id = extractIdFromSegment(idSlug);
  try {
    return await getCategory(id);
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
  const category = await loadCategory(idSlug);
  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name} at neXgen Store.`,
    alternates: { canonical: `/categories/${idSlug}` },
  };
}

/**
 * Category listing archetype — `STORE_FRONTEND_ARCHITECTURE.md` §1.1's
 * `/categories/[slug]` route, amended per the Change Log to the composite
 * `{id}-{slug}` segment (`routing/idSlug.ts`'s own docblock explains why).
 *
 * **Beta Milestone 2 — rebuilt to the milestone brief's own "Professional
 * Category Page" spec**: Toolbar (result count, sort, grid/list toggle),
 * Filter Sidebar (desktop) + Filter Drawer (mobile) — real Category
 * (sibling/child navigation) and Brand (`?brand_id=`) filters only, per
 * `FilterSidebar.tsx`'s own "two real filter dimensions today" scoping —
 * Breadcrumb, real Pagination, active-filter chips, empty/loading states
 * (`ProductGrid`'s own real empty state), and full URL synchronization
 * (`?brand_id=&sort=&direction=&page=&per_page=&view=`) — every filter
 * combination here is a real, bookmarkable, shareable URL, never
 * client-only state.
 *
 * Deliberately does not forward the request's Cookie header — see
 * `app/page.tsx`'s own docblock for why (real SSG/ISR eligibility fix,
 * found live via `next build`).
 */
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { idSlug } = await params;
  const query = await searchParams;
  const category = await loadCategory(idSlug);

  const brandId = first(query.brand_id);
  const sort = (first(query.sort) as 'name' | 'sku' | 'created_at' | 'published_at' | undefined) ?? 'published_at';
  const direction = (first(query.direction) as 'asc' | 'desc' | undefined) ?? 'desc';
  const view = first(query.view) === 'list' ? 'list' : 'grid';
  const page = Number(first(query.page) ?? '1') || 1;
  const perPage = Number(first(query.per_page) ?? '24') || 24;

  const [productsResult, allCategories, brandsResult, trending] = await Promise.all([
    getProducts({ categoryId: category.id, brandId, sort, direction, page, perPage }),
    getCategories(),
    getBrands(),
    getRecommendations({ slot: 'trending', limit: 8 }, { revalidateSeconds: 180 }),
  ]);

  const siblingsAndChildren: CategorySummary[] = allCategories.data.filter(
    (candidate) => candidate.parentId === category.parentId || candidate.parentId === category.id,
  );

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
    return search ? `/categories/${idSlug}?${search}` : `/categories/${idSlug}`;
  }

  const activeChips = brandId
    ? [{ label: brandsResult.data.find((brand) => brand.id === brandId)?.name ?? 'Brand', clearHref: withQuery({ brand_id: undefined, page: undefined }) }]
    : [];

  const filterSidebarNode = (
    <FilterSidebar
      groups={[
        {
          title: 'Category',
          options: siblingsAndChildren.map((sibling) => ({
            id: sibling.id,
            label: sibling.name,
            href: categoryHref(sibling),
            active: sibling.id === category.id,
          })),
        },
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
    { name: category.name, url: `${siteUrl}/categories/${idSlug}` },
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* server-built JSON-LD, not user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: category.name }]} />
      <CategoryBanner name={category.name} description={category.description} image={category.image} productCount={productsResult.pagination?.total} />

      <PromotionBanner heading={`Shop the full ${category.name} range`} description="New arrivals added every week." tone="subtle" />

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
            <ProductGrid
              products={productsResult.data}
              buildHref={productHref}
              columns={4}
              emptyTitle="No products in this category yet"
              emptyDescription="Check back soon — this category is still being stocked."
            />
          ) : productsResult.data.length === 0 ? (
            <ProductGrid products={[]} buildHref={productHref} emptyTitle="No products in this category yet" emptyDescription="Check back soon — this category is still being stocked." />
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

      {trending.length > 0 && <ProductGrid products={trending} buildHref={productHref} columns={4} heading="Recommended for you" />}
      <RecentlyViewedRail />
    </div>
  );
}
