import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPricingSession } from './mocks.js';

interface FakeEntry {
  id: string;
  sku: string;
  basePrice: string;
  salePrice?: string | null;
  version: number;
}

interface FakePriceList {
  id: string;
  name: string;
  currencyCode: string;
  isDefault?: boolean;
  status: string;
  version: number;
  entries: FakeEntry[];
}

function toEntryResource(priceListId: string, e: FakeEntry) {
  const isSaleActive = Boolean(e.salePrice);
  return {
    id: e.id,
    priceListId,
    sku: e.sku,
    basePrice: e.basePrice,
    compareAtPrice: null,
    salePrice: e.salePrice ?? null,
    saleStartsAt: null,
    saleEndsAt: null,
    isSaleActive,
    effectivePrice: isSaleActive ? (e.salePrice as string) : e.basePrice,
    version: e.version,
    createdAt: null,
    updatedAt: null,
  };
}

function toListResource(p: FakePriceList, withEntries: boolean) {
  return {
    id: p.id,
    name: p.name,
    currencyCode: p.currencyCode,
    isDefault: p.isDefault ?? false,
    status: p.status,
    ...(withEntries ? { entries: p.entries.map((e) => toEntryResource(p.id, e)) } : {}),
    version: p.version,
    createdAt: null,
    updatedAt: '2026-08-13T00:00:00Z',
  };
}

/**
 * Slice 2's own trimmed Price List mock — read/detail plus entry-create
 * only (what Missing Price Detection's "Add price" quick action needs), not
 * the full CRUD surface `pricing.spec.ts`'s own `mockPriceListsResource`
 * covers for Slice 1. Kept self-contained rather than imported, matching
 * this codebase's established "each spec owns its own mock" precedent.
 */
async function mockPriceLists(page: Page, initial: FakePriceList[]): Promise<void> {
  const items = initial.map((p) => ({ ...p, entries: [...p.entries] }));
  let nextEntryId = items.reduce((max, p) => max + p.entries.length, 0) + 1;

  await page.route('**/api/v1/price-lists*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ json: { data: items.map((p) => toListResource(p, false)), meta: { current_page: 1, per_page: 50, total: items.length, last_page: 1 } } });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/v1/price-lists/**', async (route) => {
    const request = route.request();
    const segments = new URL(request.url()).pathname.split('/').filter(Boolean);
    const entriesIdx = segments.indexOf('entries');
    const isEntryRoute = entriesIdx !== -1;
    const listId = isEntryRoute ? segments[entriesIdx - 1] : segments.at(-1);
    const list = items.find((i) => i.id === listId);
    if (!list) {
      await route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
      return;
    }

    if (isEntryRoute && request.method() === 'POST') {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      const entry: FakeEntry = { id: String(nextEntryId++), sku: String(body.sku).toUpperCase(), basePrice: String(body.base_price), version: 1 };
      list.entries.push(entry);
      await route.fulfill({ status: 201, json: { data: toEntryResource(list.id, entry) } });
      return;
    }

    if (!isEntryRoute && request.method() === 'GET') {
      await route.fulfill({ json: { data: toListResource(list, true) } });
      return;
    }

    await route.continue();
  });
}

/** `GET /pricing/lookup` — an in-memory map keyed `SKU|CURRENCY`, mirroring `LookupPriceAction`'s own "default active list only" resolution rule. */
async function mockLookup(page: Page, priced: Record<string, { basePrice: string; salePrice?: string }>): Promise<void> {
  await page.route('**/api/v1/pricing/lookup*', async (route) => {
    const url = new URL(route.request().url());
    const sku = (url.searchParams.get('sku') ?? '').toUpperCase();
    const currency = (url.searchParams.get('currency_code') ?? '').toUpperCase();
    const found = priced[`${sku}|${currency}`];
    if (!found) {
      await route.fulfill({ json: { data: null } });
      return;
    }
    const isSaleActive = Boolean(found.salePrice);
    await route.fulfill({
      json: {
        data: {
          id: `entry-${sku}`,
          priceListId: 'pl1',
          sku,
          basePrice: found.basePrice,
          compareAtPrice: null,
          salePrice: found.salePrice ?? null,
          saleStartsAt: null,
          saleEndsAt: null,
          isSaleActive,
          effectivePrice: isSaleActive ? (found.salePrice as string) : found.basePrice,
          version: 1,
          createdAt: null,
          updatedAt: null,
        },
      },
    });
  });
}

interface FakeProduct {
  id: string;
  name: string;
  sku: string;
  status: string;
}

async function mockProducts(page: Page, products: FakeProduct[]): Promise<void> {
  await page.route('**/api/v1/products*', async (route) => {
    const url = new URL(route.request().url());
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    let filtered = products;
    if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search));
    await route.fulfill({
      json: {
        data: filtered.map((p) => ({
          id: p.id,
          brandId: null,
          sku: p.sku,
          barcode: null,
          name: p.name,
          slug: p.sku.toLowerCase(),
          description: null,
          shortDescription: null,
          productType: 'simple',
          status: p.status,
          visibility: 'visible',
          metaTitle: null,
          metaDescription: null,
          metaKeywords: null,
          metadata: null,
          publishedAt: null,
          version: 1,
          createdAt: null,
          updatedAt: null,
        })),
        meta: { current_page: 1, per_page: 15, total: filtered.length, last_page: 1 },
      },
    });
  });
}

test.describe('Pricing — Merchant Tools (Slice 2)', () => {
  test('Price Lookup finds a price and names the default price list it came from', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceLists(page, [{ id: 'pl1', name: 'Standard Retail', currencyCode: 'USD', isDefault: true, status: 'active', version: 1, entries: [] }]);
    await mockLookup(page, { 'TSHIRT-1|USD': { basePrice: '19.9900' } });
    await mockProducts(page, []);
    await page.goto('/pricing/lookup');

    await page.getByLabel('SKU').fill('TSHIRT-1');
    await page.getByLabel('Currency').fill('USD');
    await page.getByRole('button', { name: 'Look up' }).click();

    await expect(page.getByText('$19.99')).toBeVisible();
    await expect(page.getByText(/Resolved from Standard Retail/)).toBeVisible();
  });

  test('Price Lookup reports no price with an actionable reason when the SKU has no entry', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceLists(page, [{ id: 'pl1', name: 'Standard Retail', currencyCode: 'USD', isDefault: true, status: 'active', version: 1, entries: [] }]);
    await mockLookup(page, {});
    await mockProducts(page, []);
    await page.goto('/pricing/lookup');

    await page.getByLabel('SKU').fill('MISSING-SKU');
    await page.getByLabel('Currency').fill('USD');
    await page.getByRole('button', { name: 'Look up' }).click();

    await expect(page.getByText('No price found')).toBeVisible();
    await expect(page.getByText(/has no entry for MISSING-SKU/)).toBeVisible();
  });

  test('Price Lookup explains when no default list exists at all for the currency', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceLists(page, []);
    await mockLookup(page, {});
    await mockProducts(page, []);
    await page.goto('/pricing/lookup');

    await page.getByLabel('SKU').fill('ANY-SKU');
    await page.getByLabel('Currency').fill('JPY');
    await page.getByRole('button', { name: 'Look up' }).click();

    await expect(page.getByText(/no active, default price list for JPY/)).toBeVisible();
  });

  test('Price Lookup rejects an empty SKU and a currency code that is not 3 letters, client-side', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceLists(page, []);
    await mockProducts(page, []);
    await page.goto('/pricing/lookup');

    await page.getByLabel('Currency').fill('U');
    await page.getByRole('button', { name: 'Look up' }).click();

    await expect(page.getByText('Enter a SKU')).toBeVisible();
    await expect(page.getByText('3-letter currency code')).toBeVisible();
  });

  test('Checkout Price Preview sums real per-line prices and flags an unpriced line', async ({ page }) => {
    await mockPricingSession(page);
    await mockLookup(page, { 'SKU-A|USD': { basePrice: '10.0000' }, 'SKU-B|USD': { basePrice: '5.0000' } });
    await page.goto('/pricing/checkout-preview');

    await page.getByLabel('Currency').fill('USD');
    await page.getByLabel('SKU').first().fill('SKU-A');
    await page.getByLabel('Quantity').first().fill('2');
    await page.getByRole('button', { name: 'Add line' }).click();
    const skuInputs = page.getByLabel('SKU');
    await skuInputs.nth(1).fill('SKU-C');
    await page.getByLabel('Quantity').nth(1).fill('1');

    await page.getByRole('button', { name: 'Preview prices' }).click();

    await expect(page.getByText('$20.00').first()).toBeVisible(); // SKU-A line: 10 * 2, and also the subtotal since it's the only priced line
    await expect(page.getByText('No price available')).toBeVisible(); // SKU-C has no mock entry
    await expect(page.getByText(/1 of 2 line has no price/)).toBeVisible();
    await expect(page.getByText('Subtotal (price only)')).toBeVisible();
    await expect(page.getByText(/Excludes tax, shipping, and promotions/)).toBeVisible();
  });

  test('Missing Price Detection flags an unpriced product and adds a price for it inline', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceLists(page, [
      { id: 'pl1', name: 'Standard Retail', currencyCode: 'USD', isDefault: true, status: 'active', version: 1, entries: [{ id: 'e1', sku: 'PRICED-1', basePrice: '9.99', version: 1 }] },
    ]);
    await mockProducts(page, [
      { id: 'p1', name: 'Priced Widget', sku: 'PRICED-1', status: 'active' },
      { id: 'p2', name: 'Unpriced Widget', sku: 'UNPRICED-1', status: 'active' },
    ]);
    await page.goto('/pricing/missing-prices');

    await page.getByLabel('Price list').click();
    await page.getByRole('option', { name: 'Standard Retail (USD)' }).click();

    await expect(page.getByRole('row', { name: /Priced Widget/ }).getByText('Priced', { exact: true })).toBeVisible();
    await expect(page.getByRole('row', { name: /Unpriced Widget/ }).getByText('Missing', { exact: true })).toBeVisible();
    await expect(page.getByText('1 of 2 shown is missing a price in Standard Retail')).toBeVisible();

    await page.getByRole('row', { name: /Unpriced Widget/ }).getByRole('button', { name: 'Add price' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Add price' });
    await expect(dialog.getByLabel('SKU')).toHaveValue('UNPRICED-1');
    await dialog.getByLabel('Base price').fill('14.50');
    await dialog.getByRole('button', { name: 'Add price' }).click();

    await expect(page.getByText('Price added', { exact: true })).toBeVisible();
  });

  test('Currency Coverage shows a currency missing a default distinctly from one that has it', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceLists(page, [
      { id: 'pl1', name: 'Standard Retail', currencyCode: 'USD', isDefault: true, status: 'active', version: 1, entries: [{ id: 'e1', sku: 'SKU-1', basePrice: '10.00', version: 1 }] },
      { id: 'pl2', name: 'EU Retail', currencyCode: 'EUR', isDefault: false, status: 'active', version: 1, entries: [] },
    ]);
    await page.goto('/pricing/currency-coverage');

    await expect(page.getByRole('row', { name: /USD/ }).getByText('Standard Retail')).toBeVisible();
    await expect(page.getByRole('row', { name: /USD/ }).getByRole('cell', { name: '1', exact: true })).toBeVisible();
    await expect(page.getByRole('row', { name: /EUR/ }).getByText(/Checkout can.t price this currency/)).toBeVisible();
  });

  test('has no critical or serious automated accessibility violations across all four tools', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceLists(page, [
      { id: 'pl1', name: 'Standard Retail', currencyCode: 'USD', isDefault: true, status: 'active', version: 1, entries: [{ id: 'e1', sku: 'SKU-1', basePrice: '10.00', version: 1 }] },
    ]);
    await mockLookup(page, { 'SKU-1|USD': { basePrice: '10.0000' } });
    await mockProducts(page, [{ id: 'p1', name: 'Widget', sku: 'SKU-1', status: 'active' }]);

    await page.goto('/pricing/lookup');
    await expect(page.getByRole('button', { name: 'Look up' })).toBeVisible();
    let scan = await new AxeBuilder({ page }).include('main').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    await page.goto('/pricing/checkout-preview');
    await expect(page.getByRole('button', { name: 'Preview prices' })).toBeVisible();
    scan = await new AxeBuilder({ page }).include('main').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    await page.goto('/pricing/missing-prices');
    await expect(page.getByLabel('Price list')).toBeVisible();
    scan = await new AxeBuilder({ page }).include('main').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    await page.goto('/pricing/currency-coverage');
    await expect(page.getByText('USD')).toBeVisible();
    scan = await new AxeBuilder({ page }).include('main').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
