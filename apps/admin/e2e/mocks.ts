import type { Page } from '@playwright/test';

/**
 * Every e2e spec mocks apps/backend's real API contract (06_API_STANDARD.md's
 * envelope shape, AuthController's exact response shape) via Playwright's
 * network interception — these tests exercise the Admin Engine shell itself
 * in isolation, not a live backend. A separate, live-backend integration
 * pass (real docker-compose stack) is named as remaining work in the Phase
 * 2.1 completion report, not silently assumed to be covered here.
 */
export async function mockAuthenticatedSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: { data: fakeUser() } });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

export async function mockLoginSuccess(page: Page): Promise<void> {
  // AuthController::login() (apps/backend) returns UserResource without
  // eager-loading `roles` — unlike GET /api/v1/auth/me, which does — so
  // its real response omits the `roles` key entirely (Laravel's
  // `whenLoaded()` drops it, not merely nulls it). This mock previously
  // included `roles` here, which masked a real crash
  // (`permissionSet()` calling `.flatMap` on `undefined`) that only
  // surfaced against the live backend. Kept role-less deliberately, so
  // this suite would have caught it. `useAuth.ts`'s `login()` re-fetches
  // `/auth/me` immediately after login specifically to populate `roles`,
  // which is why that route must be mocked here too.
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ json: { data: fakeUserWithoutRoles(), meta: { token: 'fake-token-for-e2e' } } });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: { data: fakeUser() } });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [] } });
  });
}

export async function mockLoginFailure(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 422,
      json: { error: { type: 'validation_failed', message: 'The given data was invalid.', details: { email: ['These credentials do not match our records.'] } } },
    });
  });
}

function fakeUserWithoutRoles() {
  const { roles: _roles, ...rest } = fakeUser();
  return rest;
}

function fakeUser() {
  return {
    id: 'u1',
    name: 'Jordan Rivera',
    email: 'jordan@example.com',
    status: 'active',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    roles: [
      {
        id: 'r1',
        name: 'admin',
        label: 'Administrator',
        version: 1,
        createdAt: null,
        updatedAt: null,
        permissions: [{ key: 'identity_access.users.view', label: 'View Users', module: 'identity_access' }],
      },
    ],
  };
}

/** Every real Catalog permission (`PermissionRegistry.php`, apps/backend) — a distinct helper from `mockAuthenticatedSession` rather than widening its own permission set, so that test's own "only grants identity_access.users.view" assertion stays true. */
const CATALOG_PERMISSIONS = [
  'catalog.products.view',
  'catalog.products.manage',
  'catalog.categories.view',
  'catalog.categories.manage',
  'catalog.brands.view',
  'catalog.brands.manage',
  'catalog.attributes.view',
  'catalog.attributes.manage',
  'catalog.options.view',
  'catalog.options.manage',
  'catalog.collections.view',
  'catalog.collections.manage',
  'catalog.tags.view',
  'catalog.tags.manage',
  'catalog.audit_log.view',
].map((key) => ({ key, label: key, module: 'catalog' }));

export async function mockCatalogSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [{ id: 'r1', name: 'admin', label: 'Administrator', version: 1, createdAt: null, updatedAt: null, permissions: CATALOG_PERMISSIONS }],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

/** Every real Inventory permission (`PermissionRegistry.php`, `app/Domains/Commerce/Inventory/Authorization/`) — mirrors `mockCatalogSession`'s own pattern for a different module's permission set. */
const INVENTORY_PERMISSIONS = [
  'inventory.warehouses.view',
  'inventory.warehouses.manage',
  'inventory.stock.view',
  'inventory.stock.manage',
  'inventory.reservations.manage',
  'inventory.transfers.manage',
  'inventory.audit_log.view',
].map((key) => ({ key, label: key, module: 'inventory' }));

export async function mockInventorySession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [{ id: 'r1', name: 'admin', label: 'Administrator', version: 1, createdAt: null, updatedAt: null, permissions: INVENTORY_PERMISSIONS }],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

/** Every real Pricing permission (`PermissionRegistry.php`, `app/Domains/Commerce/Pricing/Authorization/`) — mirrors `INVENTORY_PERMISSIONS`'s own pattern. Tax permissions are listed for completeness even though Slice 1 (Price Lists + Entries only) never exercises them. */
const PRICING_PERMISSIONS = [
  'pricing.price_lists.view',
  'pricing.price_lists.manage',
  'pricing.tax.view',
  'pricing.tax.manage',
  'pricing.audit_log.view',
].map((key) => ({ key, label: key, module: 'pricing' }));

export async function mockPricingSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [{ id: 'r1', name: 'admin', label: 'Administrator', version: 1, createdAt: null, updatedAt: null, permissions: PRICING_PERMISSIONS }],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

/**
 * Every real Customers permission (`PermissionRegistry.php`, `app/Domains/
 * Commerce/Customers/Authorization/`) — mirrors `PRICING_PERMISSIONS`'s own
 * pattern. Also includes `orders.orders.view` (Orders' own permission,
 * confirmed by reading `app/Domains/Commerce/Orders/Authorization/
 * PermissionRegistry.php` directly — genuinely a separate permission from
 * every `customers.*` key) and `identity_access.users.view` (Identity &
 * Access's own — gates the real staff directory this module's Slice 2 Audit
 * Log/Recent Activity cross-reference for actor names) — both real,
 * existing permissions this module's Slice 2 reads across, not anything
 * invented for this test suite.
 */
const CUSTOMERS_PERMISSIONS = [
  'customers.customers.view',
  'customers.customers.manage',
  'customers.audit_log.view',
  'orders.orders.view',
  'identity_access.users.view',
].map((key) => ({ key, label: key, module: 'customers' }));

export async function mockCustomersSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [{ id: 'r1', name: 'admin', label: 'Administrator', version: 1, createdAt: null, updatedAt: null, permissions: CUSTOMERS_PERMISSIONS }],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

/**
 * Every real Orders permission (`PermissionRegistry.php`, `app/Domains/
 * Commerce/Orders/Authorization/`) — mirrors `CUSTOMERS_PERMISSIONS`'s own
 * pattern. Includes `identity_access.users.view` (gates the real staff
 * directory Orders' own Audit Log and Notes cross-reference for actor
 * names, the identical shape Customers already established), plus Slice
 * 2's own four real, separate-module permissions
 * (`fulfillment.shipments.view`, `payments.payments.view`,
 * `notifications.notifications.view`, `customers.customers.view` — the
 * last one the reciprocal of Customers' own Slice 2 adding
 * `orders.orders.view` to ITS fake session for its own Recent Orders card)
 * each confirmed by reading that module's own `PermissionRegistry.php`
 * directly — genuinely real, existing permissions this module's Slice 2
 * reads across, not anything invented for this test suite.
 */
const ORDERS_PERMISSIONS = [
  'orders.orders.view',
  'orders.orders.manage',
  'orders.notes.manage',
  'orders.audit_log.view',
  'identity_access.users.view',
  'fulfillment.shipments.view',
  'payments.payments.view',
  'notifications.notifications.view',
  'customers.customers.view',
].map((key) => ({ key, label: key, module: 'orders' }));

export async function mockOrdersSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [{ id: 'r1', name: 'admin', label: 'Administrator', version: 1, createdAt: null, updatedAt: null, permissions: ORDERS_PERMISSIONS }],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

/**
 * Every real Shipping permission (`PermissionRegistry.php`, `app/Domains/
 * Operations/Shipping/Authorization/`) plus Fulfillment's own
 * (`app/Domains/Operations/Fulfillment/Authorization/`), now including the
 * four granular workflow permissions Slice 2 exercises
 * (`fulfillment.shipments.pick|pack|dispatch|cancel`) and the single
 * `fulfillment.shipments.manage` permission Slice 3's own Destination/Item/
 * Note editing sits behind — mirrors `ORDERS_PERMISSIONS`'s own pattern.
 * `identity_access.users.view` gates the real staff directory both Audit
 * Log pages (and now Notes' own author resolution) cross-reference for
 * actor names; `orders.orders.view` gates the real "View order" link on the
 * Shipments List and Shipment Detail. A "full access" session — see
 * `mockShippingPickerOnlySession` below for the narrower, real-world session
 * a picker-role warehouse staff member would actually hold.
 */
const SHIPPING_PERMISSIONS = [
  'shipping.zones.view',
  'shipping.zones.manage',
  'shipping.methods.view',
  'shipping.methods.manage',
  'shipping.rates.view',
  'shipping.rates.manage',
  'shipping.providers.view',
  'shipping.audit_log.view',
  'fulfillment.shipments.view',
  'fulfillment.shipments.manage',
  'fulfillment.shipments.pick',
  'fulfillment.shipments.pack',
  'fulfillment.shipments.dispatch',
  'fulfillment.shipments.cancel',
  'fulfillment.audit_log.view',
  'identity_access.users.view',
  'orders.orders.view',
].map((key) => ({ key, label: key, module: 'shipping' }));

export async function mockShippingSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [{ id: 'r1', name: 'admin', label: 'Administrator', version: 1, createdAt: null, updatedAt: null, permissions: SHIPPING_PERMISSIONS }],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

/**
 * A real, narrower warehouse role — `fulfillment.shipments.{view,pick}`
 * only, per `Authorization\PermissionRegistry.php`'s own least-privilege
 * intent ("a picker should not necessarily hold dispatch authority").
 * Deliberately excludes `.pack`/`.dispatch`/`.cancel` and every Shipping
 * configuration permission, so Slice 2's own permission-gating can be
 * verified against a genuinely restricted, real-shaped session rather than
 * only ever the full-access one.
 */
const SHIPPING_PICKER_ONLY_PERMISSIONS = ['fulfillment.shipments.view', 'fulfillment.shipments.pick'].map((key) => ({ key, label: key, module: 'shipping' }));

export async function mockShippingPickerOnlySession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [{ id: 'r1', name: 'picker', label: 'Warehouse Picker', version: 1, createdAt: null, updatedAt: null, permissions: SHIPPING_PICKER_ONLY_PERMISSIONS }],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

/**
 * Every real Payments permission (`PermissionRegistry.php`, `app/Domains/
 * Commerce/Payments/Authorization/`) — mirrors `SHIPPING_PERMISSIONS`'s own
 * pattern. `identity_access.users.view` gates the real staff directory the
 * Audit Log page cross-references for actor names; `orders.orders.view`/
 * `customers.customers.view` gate the real "View order"/"View customer"
 * links on Payments List and Payment Detail.
 */
const PAYMENTS_PERMISSIONS = [
  'payments.payments.view',
  'payments.payments.manage',
  'payments.bank_transfer.verify',
  'payments.audit_log.view',
  'identity_access.users.view',
  'orders.orders.view',
  'customers.customers.view',
].map((key) => ({ key, label: key, module: 'payments' }));

export async function mockPaymentsSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [{ id: 'r1', name: 'admin', label: 'Administrator', version: 1, createdAt: null, updatedAt: null, permissions: PAYMENTS_PERMISSIONS }],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

/**
 * A real, narrower Payments role — `payments.payments.view` only, per
 * `Authorization\PermissionRegistry.php`'s own least-privilege intent (a
 * read-only finance/support viewer should not necessarily hold operator
 * authority). Deliberately excludes `.manage` and `.bank_transfer.verify`,
 * so Slice 2's own permission-gating can be verified against a genuinely
 * restricted, real-shaped session rather than only ever the full-access
 * one — mirrors `mockShippingPickerOnlySession`'s own pattern.
 */
const PAYMENTS_VIEWER_ONLY_PERMISSIONS = ['payments.payments.view'].map((key) => ({ key, label: key, module: 'payments' }));

export async function mockPaymentsViewerOnlySession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [{ id: 'r2', name: 'payments-viewer', label: 'Payments Viewer', version: 1, createdAt: null, updatedAt: null, permissions: PAYMENTS_VIEWER_ONLY_PERMISSIONS }],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

/**
 * Every real Promotions permission (`PermissionRegistry.php`, `app/Domains/
 * Commerce/Promotions/Authorization/`) — mirrors `PAYMENTS_PERMISSIONS`'s
 * own pattern. `customers.customers.view` gates the real "View customer"
 * cross-link Slice 2 added to the Redemption Timeline and Redemptions List
 * (Promotion Owner's own real `customer_id` cross-domain reference).
 */
const PROMOTIONS_PERMISSIONS = [
  'promotions.promotions.view',
  'promotions.promotions.manage',
  'promotions.coupons.view',
  'promotions.coupons.manage',
  'promotions.redemptions.view',
  'promotions.audit_log.view',
  'customers.customers.view',
].map((key) => ({ key, label: key, module: 'promotions' }));

export async function mockPromotionsSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [{ id: 'r1', name: 'admin', label: 'Administrator', version: 1, createdAt: null, updatedAt: null, permissions: PROMOTIONS_PERMISSIONS }],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

/**
 * A real, narrower Promotions role — `promotions.promotions.view` only.
 * Deliberately excludes `.manage`, so Marketing Slice 1's own
 * permission-gating can be verified against a genuinely restricted,
 * real-shaped session — mirrors `mockPaymentsViewerOnlySession`'s own
 * pattern exactly.
 */
const PROMOTIONS_VIEWER_ONLY_PERMISSIONS = ['promotions.promotions.view', 'promotions.coupons.view'].map((key) => ({
  key,
  label: key,
  module: 'promotions',
}));

export async function mockPromotionsViewerOnlySession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ...fakeUser(),
          roles: [
            { id: 'r2', name: 'promotions-viewer', label: 'Promotions Viewer', version: 1, createdAt: null, updatedAt: null, permissions: PROMOTIONS_VIEWER_ONLY_PERMISSIONS },
          ],
        },
      },
    });
  });
  await page.route('**/api/v1/stores', async (route) => {
    await route.fulfill({ json: { data: [{ id: 's1', name: 'Demo Store', status: 'active' }] } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('nexgen-admin-token', 'fake-token-for-e2e');
  });
}

export interface MockCatalogRecord {
  id: string;
  version: number;
  status?: string;
  [key: string]: unknown;
}

/**
 * A minimal, real in-memory REST resource behind Playwright route
 * interception — list/create/update/archive/destroy/restore against
 * `**\/api/v1{path}`, enforcing `expected_version` the same way the real
 * backend does (mismatch -> 409), so optimistic-locking and bulk
 * partial-failure scenarios can be exercised genuinely, not merely
 * asserted. Scoped to one entity (Brands) rather than every Catalog
 * resource — see PROJECT_STATUS.md for why the full CRUD e2e matrix isn't
 * replicated across all eight entities in this pass.
 */
export interface MockCrudResourceHandle {
  /**
   * Makes the next matching write to this id+action fail with a 409, then
   * reverts to normal behavior — for exercising a real per-item bulk
   * failure/retry without fighting Playwright's own route-precedence
   * ordering (a second, narrower `page.route()` registered after this
   * helper's own wildcard route is not guaranteed to intercept first when
   * both patterns match the same URL).
   */
  failOnce: (id: string, action: 'update' | 'archive' | 'restore' | 'destroy') => void;
}

export async function mockCrudResource(page: Page, path: string, initialItems: MockCatalogRecord[]): Promise<MockCrudResourceHandle> {
  const items = [...initialItems];
  let nextId = items.length + 1;
  const base = `**/api/v1${path}`;
  const pendingFailures = new Set<string>();
  const failOnce: MockCrudResourceHandle['failOnce'] = (id, action) => pendingFailures.add(`${id}:${action}`);

  await page.route(base, async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      const url = new URL(request.url());
      const status = url.searchParams.get('status');
      const filtered = status ? items.filter((i) => i.status === status) : items;
      await route.fulfill({ json: { data: filtered, meta: { current_page: 1, per_page: 50, total: filtered.length, last_page: 1 } } });
      return;
    }
    if (request.method() === 'POST') {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      const item: MockCatalogRecord = { status: 'active', version: 1, ...body, id: String(nextId++) };
      items.push(item);
      await route.fulfill({ status: 201, json: { data: item } });
      return;
    }
    await route.continue();
  });

  await page.route(`${base}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const segments = url.pathname.split('/').filter(Boolean);
    const id = segments[segments.length - (segments.at(-1) === 'archive' || segments.at(-1) === 'restore' ? 2 : 1)];
    const action = segments.at(-1) === 'archive' || segments.at(-1) === 'restore' ? segments.at(-1) : null;
    const index = items.findIndex((i) => i.id === id);

    if (index === -1) {
      await route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
      return;
    }
    const item = items[index];
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown> & { expected_version?: number };

    function versionConflict(): boolean {
      return typeof body.expected_version === 'number' && body.expected_version !== item.version;
    }

    function consumeFailure(forAction: 'update' | 'archive' | 'restore' | 'destroy'): boolean {
      const key = `${item.id}:${forAction}`;
      if (!pendingFailures.has(key)) return false;
      pendingFailures.delete(key);
      return true;
    }

    if (request.method() === 'PATCH') {
      if (versionConflict() || consumeFailure('update')) {
        await route.fulfill({ status: 409, json: { error: { type: 'conflict', message: 'This record was changed elsewhere.' } } });
        return;
      }
      const { expected_version: _v, ...rest } = body;
      items[index] = { ...item, ...rest, version: item.version + 1 };
      await route.fulfill({ json: { data: items[index] } });
      return;
    }

    if (request.method() === 'POST' && action === 'archive') {
      if (versionConflict() || consumeFailure('archive')) {
        await route.fulfill({ status: 409, json: { error: { type: 'conflict', message: 'This record was changed elsewhere.' } } });
        return;
      }
      items[index] = { ...item, status: 'archived', version: item.version + 1 };
      await route.fulfill({ json: { data: items[index] } });
      return;
    }

    if (request.method() === 'POST' && action === 'restore') {
      if (consumeFailure('restore')) {
        await route.fulfill({ status: 409, json: { error: { type: 'conflict', message: 'This record was changed elsewhere.' } } });
        return;
      }
      items[index] = { ...item, status: 'active', version: item.version + 1 };
      await route.fulfill({ json: { data: items[index] } });
      return;
    }

    if (request.method() === 'DELETE') {
      if (versionConflict() || consumeFailure('destroy')) {
        await route.fulfill({ status: 409, json: { error: { type: 'conflict', message: 'This record was changed elsewhere.' } } });
        return;
      }
      items.splice(index, 1);
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.continue();
  });

  return { failOnce };
}

/**
 * Every Catalog list endpoint, empty — for navigation/smoke tests that
 * only need each page to render, not real data. Slice 2 additions
 * (`/media`, `/catalog/audit-logs`) are genuinely global, unlike the
 * per-product `/products/{id}/variants|images|relationships` — those need
 * a real product id, so they're each test's own concern (see
 * `mockProductsResource` in `catalog-products.spec.ts` for the pattern).
 *
 * The trailing `*` on every path is load-bearing, not decorative: a plain
 * `page.route('**\/api/v1/media', ...)` does NOT match `.../media?per_page=60`
 * at all (Playwright's glob requires the URL to end exactly where the
 * pattern does) — found live via the Product Editor's Slice 2 cards, which
 * always attach a query string. Every one of these paths is called with
 * query params by at least one real caller, so all of them need it, not
 * just the two Slice 2 added.
 */
export async function mockAllCatalogListsEmpty(page: Page): Promise<void> {
  const paths = ['/products', '/brands', '/categories', '/collections', '/tags', '/attributes', '/attribute-groups', '/options', '/media', '/catalog/audit-logs'];
  for (const path of paths) {
    await page.route(`**/api/v1${path}*`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } });
    });
  }
}
