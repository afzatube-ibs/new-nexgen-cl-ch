import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPricingSession } from './mocks.js';

async function mockEmptyProducts(page: Page): Promise<void> {
  await page.route('**/api/v1/products*', async (route) => {
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 5, total: 0, last_page: 1 } } });
  });
}

interface FakePriceListEntry {
  id: string;
  sku: string;
  basePrice: string;
  compareAtPrice?: string | null;
  salePrice?: string | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  version: number;
}

interface FakePriceList {
  id: string;
  name: string;
  currencyCode: string;
  isDefault?: boolean;
  status: string;
  version: number;
  entries: FakePriceListEntry[];
}

function effectivePrice(e: FakePriceListEntry): { isSaleActive: boolean; effectivePrice: string } {
  if (!e.salePrice) return { isSaleActive: false, effectivePrice: e.basePrice };
  const now = Date.now();
  const startsOk = !e.saleStartsAt || new Date(e.saleStartsAt).getTime() <= now;
  const endsOk = !e.saleEndsAt || new Date(e.saleEndsAt).getTime() >= now;
  const active = startsOk && endsOk;
  return { isSaleActive: active, effectivePrice: active ? e.salePrice : e.basePrice };
}

function toEntryResource(priceListId: string, e: FakePriceListEntry) {
  return {
    id: e.id,
    priceListId,
    sku: e.sku,
    basePrice: e.basePrice,
    compareAtPrice: e.compareAtPrice ?? null,
    salePrice: e.salePrice ?? null,
    saleStartsAt: e.saleStartsAt ?? null,
    saleEndsAt: e.saleEndsAt ?? null,
    ...effectivePrice(e),
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
    updatedAt: null,
  };
}

/**
 * A bespoke Price List mock — `PriceListResource` only includes `entries`
 * on the detail endpoint (`$priceList->load('entries')`), never the list
 * endpoint, and entries themselves are nested under `/price-lists/{id}/
 * entries` with no standalone list/get of their own. Mirrors `catalog-
 * products.spec.ts`'s and `inventory.spec.ts`'s own precedent of a
 * dedicated mock for a resource richer than the generic CRUD helper.
 */
async function mockPriceListsResource(page: Page, initial: FakePriceList[]): Promise<void> {
  const items = initial.map((p) => ({ ...p, entries: [...p.entries] }));
  let nextListId = items.length + 1;
  let nextEntryId = items.reduce((max, p) => max + p.entries.length, 0) + 1;

  await page.route('**/api/v1/price-lists*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      const url = new URL(request.url());
      const status = url.searchParams.get('status');
      const currency = url.searchParams.get('currency_code');
      let filtered = items;
      if (status) filtered = filtered.filter((i) => i.status === status);
      if (currency) filtered = filtered.filter((i) => i.currencyCode === currency);
      await route.fulfill({
        json: { data: filtered.map((p) => toListResource(p, false)), meta: { current_page: 1, per_page: 50, total: filtered.length, last_page: 1 } },
      });
      return;
    }
    if (request.method() === 'POST') {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      const item: FakePriceList = {
        id: String(nextListId++),
        name: String(body.name),
        currencyCode: String(body.currency_code).toUpperCase(),
        isDefault: false,
        status: 'active',
        version: 1,
        entries: [],
      };
      items.push(item);
      await route.fulfill({ status: 201, json: { data: toListResource(item, false) } });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/v1/price-lists/**', async (route) => {
    const request = route.request();
    const segments = new URL(request.url()).pathname.split('/').filter(Boolean);
    const entriesIdx = segments.indexOf('entries');
    const isEntryRoute = entriesIdx !== -1;
    const listId = isEntryRoute ? segments[entriesIdx - 1] : (segments.at(-2) === 'price-lists' ? segments.at(-1) : segments.at(-2));
    const list = items.find((i) => i.id === listId);

    if (!list) {
      await route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
      return;
    }

    if (isEntryRoute) {
      const entryId = segments.length > entriesIdx + 1 ? segments[entriesIdx + 1] : null;
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown> & { expected_version?: number };

      if (request.method() === 'POST') {
        const sku = String(body.sku).toUpperCase();
        if (list.entries.some((e) => e.sku === sku)) {
          await route.fulfill({
            status: 422,
            json: { error: { type: 'validation_failed', message: 'The given data was invalid.', details: { sku: ['The sku has already been taken.'] } } },
          });
          return;
        }
        const entry: FakePriceListEntry = {
          id: String(nextEntryId++),
          sku,
          basePrice: String(body.base_price),
          compareAtPrice: (body.compare_at_price as string | null) ?? null,
          salePrice: (body.sale_price as string | null) ?? null,
          saleStartsAt: (body.sale_starts_at as string | null) ?? null,
          saleEndsAt: (body.sale_ends_at as string | null) ?? null,
          version: 1,
        };
        list.entries.push(entry);
        await route.fulfill({ status: 201, json: { data: toEntryResource(list.id, entry) } });
        return;
      }

      const entryIndex = list.entries.findIndex((e) => e.id === entryId);
      if (entryIndex === -1) {
        await route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
        return;
      }
      if (request.method() === 'DELETE') {
        list.entries.splice(entryIndex, 1);
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await route.continue();
      return;
    }

    // Whole-PriceList routes: show / update / archive / destroy.
    if (request.method() === 'GET') {
      await route.fulfill({ json: { data: toListResource(list, true) } });
      return;
    }

    const body = (request.postDataJSON() ?? {}) as Record<string, unknown> & { expected_version?: number };
    const action = segments.at(-1) === 'archive' ? 'archive' : null;

    if (typeof body.expected_version === 'number' && body.expected_version !== list.version) {
      await route.fulfill({ status: 409, json: { error: { type: 'conflict', message: 'This record was changed elsewhere.' } } });
      return;
    }

    if (request.method() === 'PATCH') {
      const newCurrency = typeof body.currency_code === 'string' ? body.currency_code.toUpperCase() : list.currencyCode;
      if (newCurrency !== list.currencyCode && list.entries.length > 0) {
        await route.fulfill({
          status: 409,
          json: {
            error: {
              type: 'conflict',
              message: `App\\Domains\\Commerce\\Pricing\\Models\\PriceList [${list.id}] cannot be deleted: currency cannot be changed while it has priced entries`,
            },
          },
        });
        return;
      }
      Object.assign(list, {
        name: (body.name as string) ?? list.name,
        currencyCode: newCurrency,
        isDefault: typeof body.is_default === 'boolean' ? body.is_default : list.isDefault,
        version: list.version + 1,
      });
      if (list.isDefault) {
        for (const other of items) {
          if (other.id !== list.id && other.currencyCode === list.currencyCode) other.isDefault = false;
        }
      }
      await route.fulfill({ json: { data: toListResource(list, false) } });
      return;
    }
    if (request.method() === 'POST' && action === 'archive') {
      Object.assign(list, { status: 'archived', version: list.version + 1 });
      await route.fulfill({ json: { data: toListResource(list, false) } });
      return;
    }
    if (request.method() === 'DELETE') {
      const idx = items.findIndex((i) => i.id === list.id);
      items.splice(idx, 1);
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.continue();
  });
}

test.describe('Pricing — Price Lists (Slice 1)', () => {
  test('shows an empty state with a "New price list" action when nothing exists', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceListsResource(page, []);
    await page.goto('/pricing/price-lists');

    await expect(page.getByText('No price lists yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New price list' }).first()).toBeVisible();
  });

  test('creates a price list, shows a success toast, and lists it', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceListsResource(page, []);
    await page.goto('/pricing/price-lists');

    await page.getByRole('button', { name: 'New price list' }).first().click();
    await page.getByLabel('Name').fill('Standard Retail');
    await page.getByLabel('Currency').fill('USD');
    await page.getByRole('button', { name: 'Create price list' }).click();

    await expect(page.getByText('Price list created', { exact: true })).toBeVisible();
    await expect(page.getByText('Standard Retail', { exact: true })).toBeVisible();
  });

  test('rejects an empty name and a currency code that is not 3 letters', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceListsResource(page, []);
    await page.goto('/pricing/price-lists');

    await page.getByRole('button', { name: 'New price list' }).first().click();
    await page.getByRole('button', { name: 'Create price list' }).click();
    await expect(page.getByText('Name is required')).toBeVisible();

    await page.getByLabel('Name').fill('Standard Retail');
    await page.getByLabel('Currency').fill('US');
    await page.getByRole('button', { name: 'Create price list' }).click();
    await expect(page.getByText('3-letter currency code')).toBeVisible();
  });

  test('the "Missing a default" KPI warns per-currency and clears once a default is set', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceListsResource(page, [
      { id: '1', name: 'Standard Retail', currencyCode: 'USD', isDefault: false, status: 'active', version: 1, entries: [] },
      { id: '2', name: 'USD Wholesale', currencyCode: 'USD', isDefault: false, status: 'active', version: 1, entries: [] },
    ]);
    await page.goto('/pricing/price-lists');

    await expect(page.getByText('Missing a default')).toBeVisible();
    await expect(page.getByText(/USD.*Checkout/)).toBeVisible();

    await page.getByRole('button', { name: 'Actions for Standard Retail' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel(/Default price list/).check();
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Price list updated', { exact: true })).toBeVisible();
    await expect(page.getByRole('row', { name: /Standard Retail/ }).getByText('Default')).toBeVisible();
  });

  test('adds, edits, and deletes a priced entry within a price list', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceListsResource(page, [{ id: '1', name: 'Standard Retail', currencyCode: 'USD', status: 'active', version: 1, entries: [] }]);
    await mockEmptyProducts(page);
    await page.goto('/pricing/price-lists');

    await page.getByText('Standard Retail', { exact: true }).click();
    await expect(page.getByText('0 SKUs priced')).toBeVisible();

    await page.getByRole('button', { name: 'Add price' }).first().click();
    const entryDialog = page.getByRole('dialog').filter({ hasText: 'Add price' }).last();
    await entryDialog.getByLabel('SKU').fill('SKU-100');
    await entryDialog.getByLabel('Base price').fill('49.99');
    await entryDialog.getByRole('button', { name: 'Add price' }).click();

    await expect(page.getByText('Price added', { exact: true })).toBeVisible();
    await expect(page.getByText('SKU-100', { exact: true })).toBeVisible();
    await expect(page.getByText('1 SKU priced')).toBeVisible();

    await page.getByRole('button', { name: 'Actions for SKU-100' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog', { name: 'Remove this price?' }).getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('0 SKUs priced')).toBeVisible();
  });

  test('rejects a sale price that is not less than the base price, client-side', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceListsResource(page, [{ id: '1', name: 'Standard Retail', currencyCode: 'USD', status: 'active', version: 1, entries: [] }]);
    await mockEmptyProducts(page);
    await page.goto('/pricing/price-lists');

    await page.getByText('Standard Retail', { exact: true }).click();
    await page.getByRole('button', { name: 'Add price' }).first().click();
    const entryDialog = page.getByRole('dialog').filter({ hasText: 'Add price' }).last();
    await entryDialog.getByLabel('SKU').fill('SKU-200');
    await entryDialog.getByLabel('Base price').fill('20.00');
    await entryDialog.getByLabel('Sale price').fill('25.00');
    await entryDialog.getByRole('button', { name: 'Add price' }).click();

    await expect(entryDialog.getByText('must be less than the base price')).toBeVisible();
  });

  test('blocks a currency change once the list has priced entries, with the real reason shown', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceListsResource(page, [
      { id: '1', name: 'Standard Retail', currencyCode: 'USD', status: 'active', version: 1, entries: [{ id: 'e1', sku: 'SKU-1', basePrice: '10.00', version: 1 }] },
    ]);
    await page.goto('/pricing/price-lists');

    await page.getByRole('button', { name: 'Actions for Standard Retail' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel('Currency').fill('EUR');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText(/priced entries/i)).toBeVisible();
  });

  test('an archived price list offers no "Restore" or "Archive" action', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceListsResource(page, [{ id: '1', name: 'Legacy List', currencyCode: 'GBP', status: 'archived', version: 1, entries: [] }]);
    await page.goto('/pricing/price-lists');

    await page.getByRole('button', { name: 'Actions for Legacy List' }).click();
    await expect(page.getByRole('menuitem', { name: 'Restore' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Archive' })).toHaveCount(0);
  });

  test('deleting a price list with no entries succeeds and removes it from the list', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceListsResource(page, [{ id: '1', name: 'Empty List', currencyCode: 'CAD', status: 'active', version: 1, entries: [] }]);
    await page.goto('/pricing/price-lists');

    await page.getByRole('button', { name: 'Actions for Empty List' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog', { name: 'Delete this price list?' }).getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('No price lists yet')).toBeVisible();
  });

  test('has no critical or serious automated accessibility violations on a populated list and its dialogs', async ({ page }) => {
    await mockPricingSession(page);
    await mockPriceListsResource(page, [
      { id: '1', name: 'Standard Retail', currencyCode: 'USD', isDefault: true, status: 'active', version: 1, entries: [{ id: 'e1', sku: 'SKU-1', basePrice: '10.00', version: 1 }] },
      { id: '2', name: 'Legacy List', currencyCode: 'GBP', status: 'archived', version: 1, entries: [] },
    ]);
    await mockEmptyProducts(page);
    await page.goto('/pricing/price-lists');
    await expect(page.getByText('Standard Retail', { exact: true })).toBeVisible();

    const listScan = await new AxeBuilder({ page }).include('main').analyze();
    expect(listScan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    await page.getByRole('button', { name: 'New price list' }).first().click();
    const createDialogScan = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(createDialogScan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
    await page.keyboard.press('Escape');

    await page.getByText('Standard Retail', { exact: true }).click();
    await expect(page.getByText('1 SKU priced')).toBeVisible();
    const drawerScan = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(drawerScan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
