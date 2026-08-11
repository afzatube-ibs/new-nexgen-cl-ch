import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockInventorySession } from './mocks.js';

interface FakeWarehouse {
  id: string;
  code: string;
  name: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  isDefault?: boolean;
  status: string;
  version: number;
}

function toWarehouseResource(w: FakeWarehouse) {
  return {
    id: w.id,
    code: w.code,
    name: w.name,
    address: {
      line1: w.addressLine1 ?? null,
      line2: w.addressLine2 ?? null,
      city: w.city ?? null,
      region: w.region ?? null,
      postalCode: w.postalCode ?? null,
      countryCode: w.countryCode ?? null,
    },
    isDefault: w.isDefault ?? false,
    status: w.status,
    version: w.version,
    createdAt: null,
    updatedAt: null,
  };
}

/**
 * A bespoke Warehouse mock, not the generic `mockCrudResource` helper —
 * `WarehouseResource` (apps/backend) nests address fields under `address`,
 * which the generic CRUD mock (built for Brands' flatter shape) doesn't
 * reshape. Mirrors `catalog-products.spec.ts`'s own precedent of a
 * dedicated mock for a resource whose real shape is richer than the
 * generic helper — same reasoning, different entity.
 */
async function mockWarehousesResource(page: Page, initial: FakeWarehouse[]): Promise<void> {
  const items = [...initial];
  let nextId = items.length + 1;

  await page.route('**/api/v1/warehouses*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      const url = new URL(request.url());
      const status = url.searchParams.get('status');
      const filtered = status ? items.filter((i) => i.status === status) : items;
      await route.fulfill({
        json: { data: filtered.map(toWarehouseResource), meta: { current_page: 1, per_page: 50, total: filtered.length, last_page: 1 } },
      });
      return;
    }
    if (request.method() === 'POST') {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      const item: FakeWarehouse = {
        id: String(nextId++),
        code: String(body.code),
        name: String(body.name),
        addressLine1: body.address_line1 as string | undefined,
        city: body.city as string | undefined,
        countryCode: body.country_code as string | undefined,
        isDefault: Boolean(body.is_default),
        status: 'active',
        version: 1,
      };
      items.push(item);
      await route.fulfill({ status: 201, json: { data: toWarehouseResource(item) } });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/v1/warehouses/**', async (route) => {
    const request = route.request();
    const segments = new URL(request.url()).pathname.split('/').filter(Boolean);
    const lastSegment = segments.at(-1);
    const action = lastSegment === 'archive' || lastSegment === 'restore' ? lastSegment : null;
    const id = action ? segments.at(-2) : lastSegment;
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) {
      await route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
      return;
    }
    const item = items[index];
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown> & { expected_version?: number };

    if (typeof body.expected_version === 'number' && body.expected_version !== item.version) {
      await route.fulfill({ status: 409, json: { error: { type: 'conflict', message: 'This record was changed elsewhere.' } } });
      return;
    }

    if (request.method() === 'PATCH') {
      items[index] = { ...item, name: (body.name as string) ?? item.name, version: item.version + 1 };
      await route.fulfill({ json: { data: toWarehouseResource(items[index]) } });
      return;
    }
    if (request.method() === 'POST' && action === 'archive') {
      items[index] = { ...item, status: 'archived', version: item.version + 1 };
      await route.fulfill({ json: { data: toWarehouseResource(items[index]) } });
      return;
    }
    if (request.method() === 'POST' && action === 'restore') {
      items[index] = { ...item, status: 'active', version: item.version + 1 };
      await route.fulfill({ json: { data: toWarehouseResource(items[index]) } });
      return;
    }
    if (request.method() === 'DELETE') {
      await route.fulfill({
        status: 409,
        json: { error: { type: 'conflict', message: `App\\Domains\\Commerce\\Inventory\\Models\\Warehouse [${id}] cannot be deleted: it still has stock items recorded against it.` } },
      });
      return;
    }
    await route.continue();
  });
}

/** The Warehouses list's own "Stock" column (per-row `WarehouseStockCountCell`) and the Stock Levels KPI summary both query this — an empty, always-200 stub keeps every test isolated from needing to care about it explicitly. */
async function mockEmptyStockItems(page: Page): Promise<void> {
  await page.route('**/api/v1/stock-items*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } });
  });
}

async function mockEmptyProducts(page: Page): Promise<void> {
  await page.route('**/api/v1/products*', async (route) => {
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 5, total: 0, last_page: 1 } } });
  });
}

test.describe('Inventory — Warehouses', () => {
  test('create, edit, archive, and restore a warehouse; delete is blocked with the real dependent-records reason', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, []);
    await mockEmptyStockItems(page);
    await page.goto('/inventory/warehouses');

    await page.getByRole('button', { name: 'New warehouse' }).first().click();
    await page.getByLabel('Name').fill('Main Warehouse');
    await page.getByLabel('Code', { exact: true }).fill('MAIN');
    await page.getByRole('button', { name: 'Create warehouse' }).click();
    // Name and Code now render stacked in one cell (§3 density pass) — match
    // the bold name text node directly rather than the whole cell's text.
    await expect(page.getByText('Main Warehouse', { exact: true })).toBeVisible();

    // Edit
    await page.getByRole('row', { name: /Main Warehouse/ }).getByRole('button', { name: /Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel('Name').fill('Main Warehouse Renamed');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Main Warehouse Renamed', { exact: true })).toBeVisible();

    // Archive -> Restore
    await page.getByRole('row', { name: /Main Warehouse Renamed/ }).getByRole('button', { name: /Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Archive' }).click();
    await expect(page.getByRole('row', { name: /Main Warehouse Renamed/ }).getByText('archived')).toBeVisible();

    await page.getByRole('row', { name: /Main Warehouse Renamed/ }).getByRole('button', { name: /Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Restore' }).click();
    await expect(page.getByRole('row', { name: /Main Warehouse Renamed/ }).getByText('active')).toBeVisible();

    // Delete is blocked (still has stock items) — the real 409 reason surfaces
    // in the dialog itself, not a silent failure (ConfirmDialog stays open).
    await page.getByRole('row', { name: /Main Warehouse Renamed/ }).getByRole('button', { name: /Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(/still has stock items recorded against it/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    // The row's own Actions menu (its DropdownMenuItem is the ConfirmDialog's
    // trigger, same pattern as Catalog's delete confirmations) stays open
    // underneath the now-closed dialog and hides the rest of the page from
    // the accessibility tree while it's up — reload to check the underlying
    // data directly instead of fighting that focus-trap state.
    await page.reload();
    // The row is untouched — the mutation never succeeded.
    await expect(page.getByText('Main Warehouse Renamed', { exact: true })).toBeVisible();
  });

  test('shows guidance to create a warehouse first when Stock Levels has none to work with', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, []);
    await page.goto('/inventory/stock-levels');

    await expect(page.getByText('Create a warehouse to start tracking stock')).toBeVisible();
    await page.getByRole('button', { name: 'Create a warehouse' }).click();
    await expect(page).toHaveURL(/\/inventory\/warehouses$/);
  });

  test('has no critical or serious automated accessibility violations on the New Warehouse dialog', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, []);
    await mockEmptyStockItems(page);
    await page.goto('/inventory/warehouses');

    await page.getByRole('button', { name: 'New warehouse' }).first().click();
    await expect(page.getByRole('dialog', { name: 'New warehouse' })).toBeVisible();

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});

test.describe('Inventory — Stock Levels', () => {
  const warehouse: FakeWarehouse = { id: 'w1', code: 'MAIN', name: 'Main Warehouse', isDefault: true, status: 'active', version: 1 };

  test('KPI summary shows a real warehouse count and a real stock-item total from the backend', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, [warehouse]);
    await mockEmptyProducts(page);
    await page.route('**/api/v1/stock-items*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        json: {
          data: [
            { id: 'si1', warehouseId: 'w1', sku: 'HEALTHY-1', quantityOnHand: 100, quantityReserved: 0, quantityAvailable: 100, version: 1, createdAt: null, updatedAt: null },
            { id: 'si2', warehouseId: 'w1', sku: 'LOW-1', quantityOnHand: 5, quantityReserved: 0, quantityAvailable: 5, version: 1, createdAt: null, updatedAt: null },
            { id: 'si3', warehouseId: 'w1', sku: 'OUT-1', quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0, version: 1, createdAt: null, updatedAt: null },
          ],
          meta: { current_page: 1, per_page: 50, total: 3, last_page: 1 },
        },
      });
    });

    await page.goto('/inventory/stock-levels');

    const kpiGroup = page.getByRole('group', { name: 'Inventory summary' });
    const cardFor = (label: string) => kpiGroup.locator('> div').filter({ hasText: label });

    await expect(cardFor('Warehouses').getByText('1', { exact: true })).toBeVisible();
    await expect(cardFor('Stock items').getByText('3', { exact: true })).toBeVisible(); // real meta.total, not client-guessed
    await expect(cardFor('Low stock (this page)').getByText('1', { exact: true })).toBeVisible();
    await expect(cardFor('Out of stock (this page)').getByText('1', { exact: true })).toBeVisible();
  });

  test('each row shows a health status badge derived from real quantities', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, [warehouse]);
    await mockEmptyProducts(page);
    await page.route('**/api/v1/stock-items*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        json: {
          data: [{ id: 'si3', warehouseId: 'w1', sku: 'OUT-1', quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0, version: 1, createdAt: null, updatedAt: null }],
          meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 },
        },
      });
    });

    await page.goto('/inventory/stock-levels');
    await expect(page.getByRole('row', { name: /OUT-1/ }).getByText('Out of stock')).toBeVisible();
  });

  test('the Adjust Stock dialog previews Current, Adjustment, and Expected before submitting', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, [warehouse]);
    await mockEmptyProducts(page);
    await page.route('**/api/v1/stock-items*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const url = new URL(route.request().url());
      if (url.searchParams.get('sku') === 'EXISTING-SKU') {
        await route.fulfill({
          json: {
            data: [{ id: 'si1', warehouseId: 'w1', sku: 'EXISTING-SKU', quantityOnHand: 40, quantityReserved: 0, quantityAvailable: 40, version: 1, createdAt: null, updatedAt: null }],
            meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 },
          },
        });
        return;
      }
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } });
    });

    await page.goto('/inventory/stock-levels');
    await page.getByRole('button', { name: 'Adjust stock' }).first().click();
    await page.getByRole('combobox', { name: 'Warehouse' }).click();
    await page.getByRole('option', { name: /Main Warehouse/ }).click();
    await page.getByLabel('SKU').fill('EXISTING-SKU');
    await page.getByLabel('Quantity').fill('15');

    // Current 40, adding 15 -> Expected 55.
    await expect(page.getByText('Current')).toBeVisible();
    await expect(page.getByText('40', { exact: true })).toBeVisible();
    await expect(page.getByText('Expected')).toBeVisible();
    await expect(page.getByText('55', { exact: true })).toBeVisible();
  });

  test('adjusting stock succeeds, shows a success toast, and reflects the new on-hand quantity', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, [warehouse]);
    await mockEmptyStockItems(page);
    await mockEmptyProducts(page);
    await page.route('**/api/v1/stock-items/adjust', async (route) => {
      await route.fulfill({
        status: 201,
        json: { data: { id: 'si1', warehouseId: 'w1', sku: 'SKU-100', quantityOnHand: 25, quantityReserved: 0, quantityAvailable: 25, version: 1, createdAt: null, updatedAt: null } },
      });
    });

    await page.goto('/inventory/stock-levels');
    await page.getByRole('button', { name: 'Adjust stock' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Adjust stock' })).toBeVisible();

    await page.getByRole('combobox', { name: 'Warehouse' }).click();
    await page.getByRole('option', { name: /Main Warehouse/ }).click();
    await page.getByLabel('SKU').fill('SKU-100');
    await page.getByLabel('Quantity').fill('25');
    await page.getByRole('dialog', { name: 'Adjust stock' }).getByRole('button', { name: 'Adjust stock' }).click();

    await expect(page.getByText('Stock adjusted').first()).toBeVisible();
    await expect(page.getByText('SKU-100 now has 25 on hand.').first()).toBeVisible();
  });

  test('an adjustment that would oversell shows the real InsufficientStockException reason, not a generic error', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, [warehouse]);
    await mockEmptyStockItems(page);
    await mockEmptyProducts(page);
    await page.route('**/api/v1/stock-items/adjust', async (route) => {
      await route.fulfill({
        status: 409,
        json: { error: { type: 'conflict', message: 'Stock item [si1] has only 4 available, but 10 were requested.' } },
      });
    });

    await page.goto('/inventory/stock-levels');
    await page.getByRole('button', { name: 'Adjust stock' }).first().click();
    await page.getByRole('combobox', { name: 'Warehouse' }).click();
    await page.getByRole('option', { name: /Main Warehouse/ }).click();
    await page.getByLabel('SKU').fill('SKU-100');
    await page.getByRole('radio', { name: 'Remove stock' }).click();
    await page.getByLabel('Quantity').fill('10');
    await page.getByRole('dialog', { name: 'Adjust stock' }).getByRole('button', { name: 'Adjust stock' }).click();

    await expect(page.getByRole('alert').getByText('Only 4 available — 10 requested.')).toBeVisible();
  });
});

test.describe('Inventory — Reservations (Slice 2)', () => {
  const warehouse: FakeWarehouse = { id: 'w1', code: 'MAIN', name: 'Main Warehouse', isDefault: true, status: 'active', version: 1 };
  const stockItem = { id: 'si1', warehouseId: 'w1', sku: 'RESERVE-ME', quantityOnHand: 50, quantityReserved: 5, quantityAvailable: 45, version: 1, createdAt: null, updatedAt: null };

  async function openReservationsTab(page: Page): Promise<void> {
    await page.goto('/inventory/stock-levels');
    await page.getByRole('row', { name: /RESERVE-ME/ }).click();
    await expect(page.getByRole('dialog', { name: 'RESERVE-ME' })).toBeVisible();
    await page.getByRole('tab', { name: 'Reservations' }).click();
  }

  test('shows an empty state with a "Reserve stock" action when nothing is reserved', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, [warehouse]);
    await mockEmptyProducts(page);
    await page.route('**/api/v1/stock-items*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({ json: { data: [stockItem], meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 } } });
    });
    await page.route('**/api/v1/stock-items/si1/adjustments*', async (route) => {
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 } } });
    });
    await page.route('**/api/v1/stock-items/si1/reservations*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 } } });
    });

    await openReservationsTab(page);
    await expect(page.getByText('No stock reserved')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reserve stock' })).toBeVisible();
  });

  test('reserving stock succeeds, shows a success toast, and the release action frees it', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, [warehouse]);
    await mockEmptyProducts(page);
    await page.route('**/api/v1/stock-items*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({ json: { data: [stockItem], meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 } } });
    });
    await page.route('**/api/v1/stock-items/si1/adjustments*', async (route) => {
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 } } });
    });

    let reservationStatus = 'none';
    await page.route('**/api/v1/stock-items/si1/reservations*', async (route) => {
      if (route.request().method() === 'POST') {
        reservationStatus = 'active';
        await route.fulfill({
          status: 201,
          json: { data: { id: 'r1', stockItemId: 'si1', quantity: 5, referenceType: 'manual_hold', referenceId: 'Phone order #42', status: 'active', expiresAt: null, createdAt: '2026-08-12T10:00:00.000Z' } },
        });
        return;
      }
      const data =
        reservationStatus === 'none'
          ? []
          : [
              {
                id: 'r1',
                stockItemId: 'si1',
                quantity: 5,
                referenceType: 'manual_hold',
                referenceId: 'Phone order #42',
                status: reservationStatus,
                expiresAt: null,
                createdAt: '2026-08-12T10:00:00.000Z',
              },
            ];
      await route.fulfill({ json: { data, meta: { current_page: 1, per_page: 25, total: data.length, last_page: 1 } } });
    });
    await page.route('**/api/v1/reservations/r1/release', async (route) => {
      reservationStatus = 'released';
      await route.fulfill({
        json: { data: { id: 'r1', stockItemId: 'si1', quantity: 5, referenceType: 'manual_hold', referenceId: 'Phone order #42', status: 'released', expiresAt: null, createdAt: '2026-08-12T10:00:00.000Z' } },
      });
    });

    await openReservationsTab(page);
    await page.getByRole('button', { name: 'Reserve stock' }).click();
    await expect(page.getByRole('dialog', { name: 'Reserve stock' })).toBeVisible();
    await page.getByLabel('Quantity to reserve').fill('5');
    await page.getByLabel('Reference').fill('Phone order #42');
    await page.getByRole('dialog', { name: 'Reserve stock' }).getByRole('button', { name: 'Reserve stock' }).click();

    await expect(page.getByText('Stock reserved').first()).toBeVisible();
    await expect(page.getByText('Reference: Phone order #42')).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Release reservation/ }).click();
    await expect(page.getByText('Reservation released').first()).toBeVisible();
    await expect(page.getByText('Released', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Release reservation/ })).toHaveCount(0);
  });

  test('reserving stock that would oversell shows the real InsufficientStockException reason', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, [warehouse]);
    await mockEmptyProducts(page);
    await page.route('**/api/v1/stock-items*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({ json: { data: [stockItem], meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 } } });
    });
    await page.route('**/api/v1/stock-items/si1/adjustments*', async (route) => {
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 } } });
    });
    await page.route('**/api/v1/stock-items/si1/reservations*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          json: { error: { type: 'conflict', message: 'Stock item [si1] has only 45 available, but 100 were requested.' } },
        });
        return;
      }
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 } } });
    });

    await openReservationsTab(page);
    await page.getByRole('button', { name: 'Reserve stock' }).click();
    await page.getByLabel('Quantity to reserve').fill('100');
    // The client-side "would exceed" warning fires immediately from the
    // already-known Available figure, before the round trip even starts.
    await expect(page.getByText(/Only 45 Available — the server will reject/)).toBeVisible();
    await page.getByRole('dialog', { name: 'Reserve stock' }).getByRole('button', { name: 'Reserve stock' }).click();

    // The real server error replaces the client-side prediction once it arrives.
    await expect(page.getByRole('alert').getByText('Only 45 available — 100 requested.')).toBeVisible();
    await expect(page.getByText(/Only 45 Available — the server will reject/)).toHaveCount(0);
  });

  test('has no critical or serious automated accessibility violations on a populated Reservations tab and its Reserve stock dialog', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, [warehouse]);
    await mockEmptyProducts(page);
    await page.route('**/api/v1/stock-items*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({ json: { data: [stockItem], meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 } } });
    });
    await page.route('**/api/v1/stock-items/si1/adjustments*', async (route) => {
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 } } });
    });
    await page.route('**/api/v1/stock-items/si1/reservations*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        json: {
          data: [{ id: 'r1', stockItemId: 'si1', quantity: 5, referenceType: 'manual_hold', referenceId: 'Phone order #42', status: 'active', expiresAt: null, createdAt: '2026-08-12T10:00:00.000Z' }],
          meta: { current_page: 1, per_page: 25, total: 1, last_page: 1 },
        },
      });
    });

    await openReservationsTab(page);
    await expect(page.getByText('Reference: Phone order #42')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Who reserved this?' })).toBeVisible();

    let results = await new AxeBuilder({ page }).analyze();
    let seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);

    await page.getByRole('button', { name: 'Reserve stock' }).click();
    await expect(page.getByRole('dialog', { name: 'Reserve stock' })).toBeVisible();

    results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});

test.describe('Inventory — Activity', () => {
  test('renders a stock adjustment entry with a delta badge, reason, resulting on-hand, actor, and grouped under "Today"', async ({ page }) => {
    // Pins the browser clock so day-grouping ("Today"/"Yesterday") is
    // deterministic regardless of the real wall-clock date the suite
    // happens to run on.
    await page.clock.install({ time: new Date('2026-08-12T12:00:00.000Z') });
    await mockInventorySession(page);
    await page.route('**/api/v1/inventory/audit-logs*', async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: 'log1',
              actorId: 'user-12345678',
              action: 'stock.adjusted',
              targetType: 'App\\Domains\\Commerce\\Inventory\\Models\\StockItem',
              targetId: 'si1',
              before: null,
              after: { quantity_delta: -3, reason: 'Damaged / written off', quantity_on_hand: 7 },
              correlationId: null,
              createdAt: '2026-08-12T10:00:00.000Z',
            },
          ],
          meta: { current_page: 1, per_page: 25, total: 1, last_page: 1 },
        },
      });
    });
    await page.route('**/api/v1/stock-items/si1', async (route) => {
      await route.fulfill({
        json: { data: { id: 'si1', warehouseId: 'w1', sku: 'SKU-100', quantityOnHand: 7, quantityReserved: 0, quantityAvailable: 7, version: 2, createdAt: null, updatedAt: null } },
      });
    });

    await page.goto('/inventory/activity');

    await expect(page.getByText('Today', { exact: true })).toBeVisible();
    await expect(page.getByText('Stock adjusted')).toBeVisible();
    await expect(page.getByText('SKU-100')).toBeVisible();
    await expect(page.getByText('-3', { exact: true })).toBeVisible();
    await expect(page.getByText('Damaged / written off · now 7 on hand')).toBeVisible();
    await expect(page.getByText(/user-123/)).toBeVisible();
    // The actor's Avatar fallback — first two alphanumeric characters of the id, uppercased.
    await expect(page.getByText('US', { exact: true })).toBeVisible();
  });

  test('groups entries from different days under separate headers', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-08-12T12:00:00.000Z') });
    await mockInventorySession(page);
    await page.route('**/api/v1/inventory/audit-logs*', async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: 'log-today',
              actorId: 'user-1',
              action: 'warehouse.created',
              targetType: 'App\\Domains\\Commerce\\Inventory\\Models\\Warehouse',
              targetId: 'w1',
              before: null,
              after: { code: 'MAIN', name: 'Main Warehouse', is_default: true, status: 'active' },
              correlationId: null,
              createdAt: '2026-08-12T09:00:00.000Z',
            },
            {
              id: 'log-yesterday',
              actorId: 'user-1',
              action: 'warehouse.created',
              targetType: 'App\\Domains\\Commerce\\Inventory\\Models\\Warehouse',
              targetId: 'w0',
              before: null,
              after: { code: 'OLD', name: 'Old Warehouse', is_default: false, status: 'active' },
              correlationId: null,
              createdAt: '2026-08-11T09:00:00.000Z',
            },
          ],
          meta: { current_page: 1, per_page: 25, total: 2, last_page: 1 },
        },
      });
    });

    await page.goto('/inventory/activity');

    await expect(page.getByText('Today', { exact: true })).toBeVisible();
    await expect(page.getByText('Yesterday', { exact: true })).toBeVisible();
    await expect(page.getByText('Main Warehouse (MAIN)')).toBeVisible();
    await expect(page.getByText('Old Warehouse (OLD)')).toBeVisible();
  });

  test('filtering by type requests the matching target_type', async ({ page }) => {
    await mockInventorySession(page);
    let lastTargetType: string | null = null;
    await page.route('**/api/v1/inventory/audit-logs*', async (route) => {
      lastTargetType = new URL(route.request().url()).searchParams.get('target_type');
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 } } });
    });

    await page.goto('/inventory/activity');
    await expect(page.getByText('No activity yet')).toBeVisible();

    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: 'Warehouses' }).click();

    await expect.poll(() => lastTargetType).toBe('App\\Domains\\Commerce\\Inventory\\Models\\Warehouse');
  });

  test('has no critical or serious automated accessibility violations with a populated, day-grouped timeline', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-08-12T12:00:00.000Z') });
    await mockInventorySession(page);
    await page.route('**/api/v1/inventory/audit-logs*', async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: 'log1',
              actorId: 'user-12345678',
              action: 'stock.adjusted',
              targetType: 'App\\Domains\\Commerce\\Inventory\\Models\\StockItem',
              targetId: 'si1',
              before: null,
              after: { quantity_delta: -3, reason: 'Damaged / written off', quantity_on_hand: 7 },
              correlationId: null,
              createdAt: '2026-08-12T10:00:00.000Z',
            },
          ],
          meta: { current_page: 1, per_page: 25, total: 1, last_page: 1 },
        },
      });
    });
    await page.route('**/api/v1/stock-items/si1', async (route) => {
      await route.fulfill({
        json: { data: { id: 'si1', warehouseId: 'w1', sku: 'SKU-100', quantityOnHand: 7, quantityReserved: 0, quantityAvailable: 7, version: 2, createdAt: null, updatedAt: null } },
      });
    });

    await page.goto('/inventory/activity');
    await expect(page.getByText('Today', { exact: true })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});

test.describe('Inventory — Stock Levels accessibility', () => {
  test('has no critical or serious automated accessibility violations with KPI cards and health badges populated', async ({ page }) => {
    await mockInventorySession(page);
    await mockWarehousesResource(page, [{ id: 'w1', code: 'MAIN', name: 'Main Warehouse', isDefault: true, status: 'active', version: 1 }]);
    await mockEmptyProducts(page);
    await page.route('**/api/v1/stock-items*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        json: {
          data: [
            { id: 'si1', warehouseId: 'w1', sku: 'HEALTHY-1', quantityOnHand: 100, quantityReserved: 0, quantityAvailable: 100, version: 1, createdAt: null, updatedAt: null },
            { id: 'si2', warehouseId: 'w1', sku: 'LOW-1', quantityOnHand: 5, quantityReserved: 2, quantityAvailable: 3, version: 1, createdAt: null, updatedAt: null },
            { id: 'si3', warehouseId: 'w1', sku: 'OUT-1', quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0, version: 1, createdAt: null, updatedAt: null },
          ],
          meta: { current_page: 1, per_page: 50, total: 3, last_page: 1 },
        },
      });
    });

    await page.goto('/inventory/stock-levels');
    await expect(page.getByRole('row', { name: /OUT-1/ }).getByText('Out of stock')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});
