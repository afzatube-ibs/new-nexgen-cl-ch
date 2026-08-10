import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockCatalogSession } from './mocks.js';

const CATALOG_PRODUCT_TARGET_TYPE = 'App\\Domains\\Commerce\\Catalog\\Models\\Product';

function fakeConfigurableProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    brandId: null,
    sku: 'SHIRT-1',
    barcode: null,
    name: 'Shirt',
    slug: 'shirt',
    description: null,
    shortDescription: null,
    productType: 'configurable',
    status: 'draft',
    visibility: 'catalog_search',
    metaTitle: null,
    metaDescription: null,
    metaKeywords: null,
    metadata: null,
    publishedAt: null,
    categories: [] as Record<string, unknown>[],
    collections: [] as Record<string, unknown>[],
    tags: [] as Record<string, unknown>[],
    images: [] as Record<string, unknown>[],
    variants: [] as Record<string, unknown>[],
    attributeValues: [] as Record<string, unknown>[],
    relationships: [] as Record<string, unknown>[],
    version: 1,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const OPTION_SIZE = {
  id: 'opt1',
  code: 'size',
  name: 'Size',
  position: 0,
  values: [
    { id: 'v1', optionId: 'opt1', value: 'Small', slug: 'small', position: 0 },
    { id: 'v2', optionId: 'opt1', value: 'Large', slug: 'large', position: 1 },
  ],
  version: 1,
  createdAt: null,
  updatedAt: null,
};

const CATEGORY_SHIRTS = {
  id: 'cat1',
  parentId: null,
  name: 'Shirts',
  slug: 'shirts',
  description: null,
  position: 0,
  metaTitle: null,
  metaDescription: null,
  status: 'active',
  version: 1,
  createdAt: null,
  updatedAt: null,
};

/** Every route this Product Editor's Slice 2 sub-cards call, wired to one mutable in-memory `product` — narrower than `mockAllCatalogListsEmpty` (which doesn't cover the `/products/{id}/*` sub-resources or `/media` at all). */
async function mockSlice2Product(page: Page, initial: ReturnType<typeof fakeConfigurableProduct>) {
  let product = initial;
  let variants: Record<string, unknown>[] = [];
  let images: Record<string, unknown>[] = [];
  let nextVariantId = 1;
  let nextImageId = 1;

  await page.route('**/api/v1/brands', (route) => route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } }));
  await page.route('**/api/v1/options', (route) => route.fulfill({ json: { data: [OPTION_SIZE], meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 } } }));
  await page.route('**/api/v1/categories', (route) => route.fulfill({ json: { data: [CATEGORY_SHIRTS], meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 } } }));
  await page.route('**/api/v1/collections', (route) => route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } }));
  await page.route('**/api/v1/tags', (route) => route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } }));
  // A trailing `*` here is load-bearing, not decorative: Playwright's plain
  // glob `page.route()` patterns require the URL to end exactly where the
  // pattern does, unless a wildcard tolerates trailing characters — a bare
  // `'**/api/v1/media'` does NOT match `.../media?per_page=60` at all, so
  // that GET silently falls through to the real network (this session's
  // real backend on :8080, which 401s on the fake e2e token, triggering a
  // full logout). Found live, via this exact test, not assumed — every
  // route below that's ever called with query params needs the same `*`.
  await page.route('**/api/v1/media*', async (route) => {
    if (route.request().method() === 'POST') {
      const asset = {
        id: 'media1',
        url: 'https://example.com/shirt.png',
        filename: 'shirt.png',
        mimeType: 'image/png',
        size: 1024,
        width: 200,
        height: 200,
        altText: null,
        uploadedBy: null,
        version: 1,
        createdAt: null,
        updatedAt: null,
      };
      await route.fulfill({ status: 201, json: { data: asset } });
      return;
    }
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } });
  });

  await page.route('**/api/v1/products/1/variants', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { sku: string; barcode?: string | null; option_value_ids: string[] };
      const variant = {
        id: String(nextVariantId++),
        productId: '1',
        sku: body.sku,
        barcode: body.barcode ?? null,
        status: 'active',
        position: variants.length,
        optionValues: OPTION_SIZE.values.filter((v) => body.option_value_ids.includes(v.id)),
        version: 1,
        createdAt: null,
        updatedAt: null,
      };
      variants = [...variants, variant];
      product = { ...product, variants };
      await route.fulfill({ status: 201, json: { data: variant } });
      return;
    }
    await route.fulfill({ json: { data: variants, meta: { current_page: 1, per_page: 50, total: variants.length, last_page: 1 } } });
  });

  await page.route('**/api/v1/products/1/images', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { media_id: string; position?: number; is_primary?: boolean };
      const image = { id: String(nextImageId++), mediaId: body.media_id, url: 'https://example.com/shirt.png', altText: null, position: body.position ?? 0, isPrimary: body.is_primary ?? false };
      images = [...images, image];
      product = { ...product, images };
      await route.fulfill({ status: 201, json: { data: image } });
      return;
    }
    await route.fulfill({ json: { data: images, meta: { current_page: 1, per_page: 50, total: images.length, last_page: 1 } } });
  });

  await page.route('**/api/v1/products/1/relationships', (route) => route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } }));

  await page.route('**/api/v1/products/1/options', async (route) => {
    // `SyncProductOptionsAction` only reloads `options` — which `ProductResource` never even serializes — so this response's shape genuinely carries no options-related field back; the UI relies on invalidating the variants list, not this response body.
    await route.fulfill({ json: { data: product } });
  });

  await page.route('**/api/v1/products/1/categories', async (route) => {
    const body = route.request().postDataJSON() as { category_ids: string[] };
    product = { ...product, categories: [CATEGORY_SHIRTS].filter((c) => body.category_ids.includes(c.id)) };
    await route.fulfill({ json: { data: product } });
  });

  await page.route('**/api/v1/catalog/audit-logs*', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 'log1',
            actorId: 'u1',
            action: 'product.created',
            targetType: CATALOG_PRODUCT_TARGET_TYPE,
            targetId: '1',
            before: null,
            after: { sku: 'SHIRT-1' },
            correlationId: null,
            createdAt: '2026-08-10T00:00:00Z',
          },
        ],
        meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 },
      },
    }),
  );

  await page.route('**/api/v1/products/1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { data: { ...product, variants, images } } });
      return;
    }
    await route.continue();
  });

  return { get current() { return product; } };
}

test.describe('Catalog — Product Editor (Slice 2)', () => {
  test('Variants: assigning an option and generating one variant creates it with a real, working combination', async ({ page }) => {
    await mockCatalogSession(page);
    await mockSlice2Product(page, fakeConfigurableProduct());

    await page.goto('/catalog/products/1');
    await expect(page.getByRole('heading', { name: 'Variants' })).toBeVisible();

    await page.getByRole('checkbox', { name: 'Size' }).check();
    await page.getByRole('button', { name: 'Save options' }).click();

    await expect(page.getByRole('button', { name: /Small \/ Large|Small$/ }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Small', exact: false }).first().click();

    await expect(page.getByText('SHIRT-1-SMALL', { exact: false })).toBeVisible();
  });

  test('Organization: assigning a category marks the publish checklist item done', async ({ page }) => {
    await mockCatalogSession(page);
    await mockSlice2Product(page, fakeConfigurableProduct());

    await page.goto('/catalog/products/1');
    await expect(page.getByRole('heading', { name: 'Organization' })).toBeVisible();
    await expect(page.getByText('(not yet available)')).toHaveCount(0);
    await expect(page.getByText('At least one category', { exact: true })).toBeVisible();

    await page.getByRole('checkbox', { name: 'Shirts' }).click();
    await expect(page.getByRole('checkbox', { name: 'Shirts' })).toBeChecked({ timeout: 2000 });
    await page.getByRole('button', { name: 'Save organization' }).click();

    await expect(page.getByRole('checkbox', { name: 'Shirts' })).toBeChecked();
  });

  test('Media Manager: uploading a file attaches it as the first (primary) image', async ({ page }) => {
    await mockCatalogSession(page);
    await mockSlice2Product(page, fakeConfigurableProduct());

    await page.goto('/catalog/products/1');
    await page.getByRole('button', { name: 'Add images' }).click();
    await expect(page.getByRole('heading', { name: 'Media library' })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({ name: 'shirt.png', mimeType: 'image/png', buffer: Buffer.from('fake-png-bytes') });

    // The dialog deliberately stays open after a successful upload/select
    // (its own docblock: "so several can be picked in one visit") — close
    // it explicitly rather than asserting it auto-closes.
    await expect(page.getByText('shirt.png')).toBeHidden({ timeout: 10000 }); // the in-flight upload row is gone once it succeeds
    await page.keyboard.press('Escape');
    await expect(page.getByText('Primary')).toBeVisible();
  });

  test('Activity: shows this product\'s own audit entries, humanized', async ({ page }) => {
    await mockCatalogSession(page);
    await mockSlice2Product(page, fakeConfigurableProduct());

    await page.goto('/catalog/products/1');
    await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
    await expect(page.getByText('Product created')).toBeVisible();
  });

  test('has no critical or serious automated accessibility violations with Slice 2 data loaded', async ({ page }) => {
    await mockCatalogSession(page);
    await mockSlice2Product(page, fakeConfigurableProduct({ categories: [CATEGORY_SHIRTS] }));

    await page.goto('/catalog/products/1');
    await expect(page.getByRole('heading', { name: 'Shirt' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Variants' })).toBeVisible();

    const results = await new AxeBuilder({ page }).include('body').analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});
