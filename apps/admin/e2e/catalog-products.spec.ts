import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockCatalogSession, mockAllCatalogListsEmpty } from './mocks.js';

interface FakeProduct {
  id: string;
  brandId: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  productType: string;
  status: string;
  visibility: string;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  metadata: unknown;
  publishedAt: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

function fakeProduct(overrides: Record<string, unknown> = {}): FakeProduct {
  return {
    id: '1',
    brandId: null,
    sku: 'WIDGET-1',
    barcode: null,
    name: 'Widget',
    slug: 'widget',
    description: null,
    shortDescription: null,
    productType: 'simple',
    status: 'draft',
    visibility: 'catalog_search',
    metaTitle: null,
    metaDescription: null,
    metaKeywords: null,
    metadata: null,
    publishedAt: null,
    version: 1,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

/** A minimal real CRUD mock for `/products` — list/create/get-single/destroy — used by the redesigned-editor tests below (`mockCrudResource` in mocks.ts doesn't cover single-record GET, which the editor's own `useProduct` needs). */
async function mockProductsResource(page: Page, initial: FakeProduct): Promise<{ get current(): FakeProduct }> {
  let product = initial;
  await page.route('**/api/v1/products', async (route) => {
    if (route.request().method() === 'POST') {
      product = fakeProduct(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ status: 201, json: { data: product } });
      return;
    }
    await route.fulfill({ json: { data: [product], meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 } } });
  });
  await page.route(`**/api/v1/products/${initial.id}`, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: { data: product } });
      return;
    }
    if (method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.continue();
  });
  // Product-scoped Slice 2 sub-resources — the Product Editor's
  // Variants/Media/Related-products cards fire these unconditionally for
  // any loaded existing product now, independent of what a given test is
  // actually exercising. Not product-id-agnostic like `/media`/`/catalog/
  // audit-logs` (covered by `mockAllCatalogListsEmpty` instead), so this
  // helper — which already knows the id — is where they belong.
  for (const sub of ['variants', 'images', 'relationships']) {
    await page.route(`**/api/v1/products/${initial.id}/${sub}*`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } });
    });
  }
  return {
    get current() {
      return product;
    },
  };
}

test.describe('Catalog — Products', () => {
  test('create a product, then the real publish-completeness rule is surfaced verbatim before a retry succeeds', async ({ page }) => {
    await mockCatalogSession(page);
    await mockAllCatalogListsEmpty(page);

    let product = fakeProduct();
    let publishAttempts = 0;

    await page.route('**/api/v1/products', async (route) => {
      if (route.request().method() === 'POST') {
        product = fakeProduct(route.request().postDataJSON() as Record<string, unknown>);
        await route.fulfill({ status: 201, json: { data: product } });
        return;
      }
      await route.fulfill({ json: { data: [product], meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 } } });
    });
    await page.route('**/api/v1/products/1', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { data: product } });
        return;
      }
      await route.continue();
    });
    // Product-scoped Slice 2 sub-resources the editor now always fetches
    // for an existing product — see `mockProductsResource`'s own comment
    // below for why these can't live in the shared `mockAllCatalogListsEmpty`.
    for (const sub of ['variants', 'images', 'relationships']) {
      await page.route(`**/api/v1/products/1/${sub}*`, async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }
        await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } });
      });
    }
    await page.route('**/api/v1/products/1/publish', async (route) => {
      publishAttempts++;
      if (publishAttempts === 1) {
        // The real backend's 422 for this has no `details` key at all — a
        // single combined sentence in `message` only (confirmed live
        // against a real running apps/backend, Phase 2.2A). Mocked to
        // match that real shape, not the `details.reasons` array
        // originally (and wrongly) assumed — a real bug this redesign
        // found and fixed (see PHASE_2_2A_PRODUCT_EDITOR_UX_REPORT.md).
        await route.fulfill({
          status: 422,
          json: {
            error: {
              type: 'validation_failed',
              message: 'Product [1] is not ready to publish: it is not assigned to at least one category.',
            },
          },
        });
        return;
      }
      product = { ...product, status: 'active', publishedAt: '2026-08-10T00:00:00Z', version: product.version + 1 };
      await route.fulfill({ json: { data: product } });
    });

    await page.goto('/catalog/products');
    await page.getByRole('button', { name: 'New product' }).click();
    await expect(page).toHaveURL(/\/catalog\/products\/new$/);

    await page.getByLabel('Name').fill('Widget');
    await page.getByLabel('SKU').fill('WIDGET-1');
    await page.getByRole('button', { name: 'Create product' }).click();

    await expect(page).toHaveURL(/\/catalog\/products\/1$/);
    // Status shows in two places by design — the sticky bar (glanceable
    // while scrolled) and the sidebar's own Status & visibility card.
    await expect(page.getByText('draft').first()).toBeVisible();

    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText("This product isn't ready to publish yet")).toBeVisible();
    await expect(page.getByText('Product [1] is not ready to publish: it is not assigned to at least one category.')).toBeVisible();

    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('active').first()).toBeVisible();
    expect(publishAttempts).toBe(2);
  });

  test('the unsaved-changes indicator appears while editing and clearing it requires confirming a discard', async ({ page }) => {
    await mockCatalogSession(page);
    await mockAllCatalogListsEmpty(page);
    await page.goto('/catalog/products/new');
    await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible();

    await expect(page.getByText('Unsaved changes')).toHaveCount(0);
    await page.getByLabel('Name').fill('Draft Product');
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    // The back button itself changes label/behavior once dirty — clicking
    // it must confirm before actually discarding.
    await page.getByRole('button', { name: 'Back to products (unsaved changes)' }).click();
    await expect(page.getByText('Discard unsaved changes?')).toBeVisible();
    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/catalog\/products$/);
  });

  test('the slug preview reflects the typed name and "Use this" fills the real field', async ({ page }) => {
    await mockCatalogSession(page);
    await mockAllCatalogListsEmpty(page);
    await page.goto('/catalog/products/new');
    await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible();

    await page.getByLabel('Name').fill('Café Deluxe Widget');
    await expect(page.getByText('Preview: /products/cafe-deluxe-widget')).toBeVisible();
    await expect(page.getByLabel('Slug')).toHaveValue('');

    await page.getByRole('button', { name: 'Use this' }).click();
    await expect(page.getByLabel('Slug')).toHaveValue('cafe-deluxe-widget');
    // Once a real value is present, the preview/"Use this" affordance goes away.
    await expect(page.getByText(/Preview:/)).toHaveCount(0);
  });

  test('Ctrl/Cmd+S saves the form, matching the button click', async ({ page }) => {
    await mockCatalogSession(page);
    await mockAllCatalogListsEmpty(page);
    let created: FakeProduct | null = null;
    await page.route('**/api/v1/products', async (route) => {
      if (route.request().method() === 'POST') {
        created = fakeProduct(route.request().postDataJSON() as Record<string, unknown>);
        await route.fulfill({ status: 201, json: { data: created } });
        return;
      }
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } });
    });
    await page.route('**/api/v1/products/1', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { data: created } });
        return;
      }
      await route.continue();
    });

    await page.goto('/catalog/products/new');
    await page.getByLabel('Name').fill('Keyboard Saved Product');
    await page.getByLabel('SKU').fill('KBD-1');
    await page.keyboard.press('Control+s');

    await expect(page).toHaveURL(/\/catalog\/products\/1$/);
    expect(created).toMatchObject({ name: 'Keyboard Saved Product', sku: 'KBD-1' });
  });

  test('Duplicate prefills a new product from the current one, with SKU and slug cleared', async ({ page }) => {
    await mockCatalogSession(page);
    await mockAllCatalogListsEmpty(page);
    await mockProductsResource(page, fakeProduct({ name: 'Original Widget', sku: 'ORIG-1', slug: 'original-widget' }));

    await page.goto('/catalog/products/1');
    await expect(page.getByRole('heading', { name: 'Original Widget' })).toBeVisible();

    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();

    await expect(page).toHaveURL(/\/catalog\/products\/new$/);
    await expect(page.getByLabel('Name')).toHaveValue('Original Widget (copy)');
    await expect(page.getByLabel('SKU')).toHaveValue('');
    await expect(page.getByLabel('Slug')).toHaveValue('');
  });

  test('Delete (from the overflow menu) removes the product and returns to the list, with no console errors', async ({ page }) => {
    await mockCatalogSession(page);
    await mockAllCatalogListsEmpty(page);
    await mockProductsResource(page, fakeProduct());

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/catalog/products/1');
    await expect(page.getByRole('heading', { name: 'Widget' })).toBeVisible();

    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(page.getByText('Delete this product?')).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page).toHaveURL(/\/catalog\/products$/);
    // The real bug this redesign found and fixed: nesting a Dialog trigger
    // inside a non-forwardRef DropdownMenuItem threw "Function components
    // cannot be given refs" — this asserts it stays fixed.
    const refWarnings = consoleErrors.filter((e) => e.includes('cannot be given refs'));
    expect(refWarnings).toEqual([]);
  });

  test('has no critical or serious automated accessibility violations on the Product form', async ({ page }) => {
    await mockCatalogSession(page);
    await mockAllCatalogListsEmpty(page);
    await page.goto('/catalog/products/new');
    await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible();

    const results = await new AxeBuilder({ page }).include('body').analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});
