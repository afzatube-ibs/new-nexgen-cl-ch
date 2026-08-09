import { test, expect } from '@playwright/test';
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
    await page.route('**/api/v1/products/1/publish', async (route) => {
      publishAttempts++;
      if (publishAttempts === 1) {
        await route.fulfill({
          status: 422,
          json: {
            error: {
              type: 'validation_failed',
              message: 'This product is not ready to publish.',
              details: { reasons: ['Product must be assigned to at least one category.'] },
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
    await expect(page.getByText('draft')).toBeVisible();

    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText("This product isn't ready to publish yet")).toBeVisible();
    await expect(page.getByText('Product must be assigned to at least one category.')).toBeVisible();

    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('active')).toBeVisible();
    expect(publishAttempts).toBe(2);
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
