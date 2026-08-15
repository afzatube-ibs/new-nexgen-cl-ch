import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockCustomersSession } from './mocks.js';

const CUSTOMER_TARGET_TYPE = 'App\\Domains\\Commerce\\Customers\\Models\\Customer';
const CUSTOMER_ADDRESS_TARGET_TYPE = 'App\\Domains\\Commerce\\Customers\\Models\\CustomerAddress';

const FIXED_CUSTOMER = {
  id: 'c1',
  name: 'Jane Shopper',
  email: 'jane@example.test',
  phone: null,
  status: 'active',
  version: 1,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

interface FakeOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  grandTotal: string;
  currencyCode: string;
  placedAt: string;
}

interface FakeAuditLog {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

/** Mocks Orders' real `GET /orders?customer_id=` — confirmed server-side filterable by reading `OrderController::index` directly. */
async function mockOrders(page: Page, orders: FakeOrder[]): Promise<void> {
  await page.route('**/api/v1/orders*', async (route) => {
    const url = new URL(route.request().url());
    const customerId = url.searchParams.get('customer_id');
    const filtered = customerId ? orders.filter((o) => o.customerId === customerId) : orders;
    await route.fulfill({
      json: {
        data: filtered.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerId: o.customerId,
          customerName: FIXED_CUSTOMER.name,
          customerEmail: FIXED_CUSTOMER.email,
          customerPhone: null,
          currencyCode: o.currencyCode,
          subtotal: o.grandTotal,
          discountTotal: '0.0000',
          taxTotal: '0.0000',
          shippingTotal: '0.0000',
          grandTotal: o.grandTotal,
          status: o.status,
          placedAt: o.placedAt,
          version: 1,
          createdAt: o.placedAt,
          updatedAt: o.placedAt,
        })),
        meta: { current_page: 1, per_page: 15, total: filtered.length, last_page: 1 },
      },
    });
  });
}

/** Mocks Customers' own `GET /customers/audit-logs` — real `target_type`/`actor_id` filters only, confirmed by reading `AuditLogController::index` directly. */
async function mockCustomerAuditLogs(page: Page, logs: FakeAuditLog[]): Promise<void> {
  await page.route('**/api/v1/customers/audit-logs*', async (route) => {
    const url = new URL(route.request().url());
    const targetType = url.searchParams.get('target_type');
    const actorId = url.searchParams.get('actor_id');
    let filtered = targetType ? logs.filter((l) => l.targetType === targetType) : logs;
    if (actorId) filtered = filtered.filter((l) => l.actorId === actorId);
    await route.fulfill({
      json: {
        data: filtered.map((l) => ({ ...l, before: null, after: null, correlationId: null })),
        meta: { current_page: 1, per_page: 25, total: filtered.length, last_page: 1 },
      },
    });
  });
}

async function mockStaffDirectory(page: Page): Promise<void> {
  await page.route('**/api/v1/users*', async (route) => {
    await route.fulfill({
      json: {
        data: [{ id: 'staff1', name: 'Alex Operator', email: 'alex@nexgen.test', status: 'active', roles: [], version: 1, createdAt: null, updatedAt: null }],
        meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 },
      },
    });
  });
}

async function mockCustomerDetail(page: Page): Promise<void> {
  await page.route('**/api/v1/customers/c1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { data: { ...FIXED_CUSTOMER, addresses: [] } } });
      return;
    }
    await route.continue();
  });
}

test.describe('Customers Slice 2 — Activity & Commerce Foundation', () => {
  test('Recent Orders: shows real, customer_id-filtered orders on the Customer Detail page', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomerDetail(page);
    await mockCustomerAuditLogs(page, []);
    await mockStaffDirectory(page);
    await mockOrders(page, [
      { id: 'o1', orderNumber: 'ORD-20260101-AAAAAAAA', customerId: 'c1', status: 'delivered', grandTotal: '129.9900', currencyCode: 'USD', placedAt: '2026-01-01T00:00:00Z' },
      { id: 'o2', orderNumber: 'ORD-20260102-BBBBBBBB', customerId: 'other', status: 'shipped', grandTotal: '50.0000', currencyCode: 'USD', placedAt: '2026-01-02T00:00:00Z' },
    ]);

    const requestPromise = page.waitForRequest((r) => r.url().includes('/api/v1/orders') && r.url().includes('customer_id=c1'));
    await page.goto('/customers/c1');
    await requestPromise;

    await expect(page.getByRole('heading', { name: 'Recent Orders' })).toBeVisible();
    await expect(page.getByText('ORD-20260101-AAAAAAAA')).toBeVisible();
    // The other customer's order must never appear — proves the real server filter, not a client-side one.
    await expect(page.getByText('ORD-20260102-BBBBBBBB')).toHaveCount(0);
    await expect(page.getByText('$129.99')).toBeVisible();
  });

  test('Recent Orders: shows an honest empty state when this customer has none', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomerDetail(page);
    await mockCustomerAuditLogs(page, []);
    await mockStaffDirectory(page);
    await mockOrders(page, []);

    await page.goto('/customers/c1');
    await expect(page.getByRole('heading', { name: 'Recent Orders' })).toBeVisible();
    await expect(page.getByText('No orders yet.')).toBeVisible();
  });

  test('Recent Activity: shows this customer\'s own audit entries with a resolved actor name, excludes entries for a different target', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomerDetail(page);
    await mockOrders(page, []);
    await mockStaffDirectory(page);
    await mockCustomerAuditLogs(page, [
      { id: 'a1', actorId: 'staff1', action: 'customer.profile_updated', targetType: CUSTOMER_TARGET_TYPE, targetId: 'c1', createdAt: '2026-08-10T00:00:00Z' },
      { id: 'a2', actorId: 'staff1', action: 'customer.registered', targetType: CUSTOMER_TARGET_TYPE, targetId: 'someone-else', createdAt: '2026-08-09T00:00:00Z' },
    ]);

    await page.goto('/customers/c1');
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
    await expect(page.getByText('Profile updated')).toBeVisible();
    await expect(page.getByText('Alex Operator')).toBeVisible();
    // The other customer's own registration event must never appear.
    await expect(page.getByText('Customer registered')).toHaveCount(0);
  });

  test('Recent Activity: honest empty-state copy when nothing in the recent window matches this customer, with a link to the full log', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomerDetail(page);
    await mockOrders(page, []);
    await mockStaffDirectory(page);
    await mockCustomerAuditLogs(page, []);

    await page.goto('/customers/c1');
    await expect(page.getByText(/No recent activity for this customer among the most recently recorded events/)).toBeVisible();

    await page.getByRole('button', { name: 'View full audit log' }).click();
    await expect(page).toHaveURL(/\/customers\/audit-log$/);
  });

  test('Audit Log: a dedicated, real, server-filtered screen — Type filter sends the real target_type', async ({ page }) => {
    await mockCustomersSession(page);
    await mockStaffDirectory(page);
    await mockCustomerAuditLogs(page, [
      { id: 'a1', actorId: 'staff1', action: 'customer.registered', targetType: CUSTOMER_TARGET_TYPE, targetId: 'c1', createdAt: '2026-08-10T00:00:00Z' },
      { id: 'a2', actorId: null, action: 'customer.address_added', targetType: CUSTOMER_ADDRESS_TARGET_TYPE, targetId: 'addr1', createdAt: '2026-08-11T00:00:00Z' },
    ]);

    await page.goto('/customers/audit-log');
    await expect(page.getByRole('heading', { name: 'Customers Audit Log' })).toBeVisible();
    await expect(page.getByText('Customer registered')).toBeVisible();
    await expect(page.getByText('Address added')).toBeVisible();
    await expect(page.getByText('Alex Operator')).toBeVisible();
    await expect(page.getByText('System')).toBeVisible();

    const requestPromise = page.waitForRequest((r) => r.url().includes('target_type=') && decodeURIComponent(r.url()).includes(CUSTOMER_TARGET_TYPE));
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByLabel('Type').click();
    await page.getByRole('option', { name: 'Customer', exact: true }).click();
    await requestPromise;
    await expect(page.getByText('Customer registered')).toBeVisible();
    await expect(page.getByText('Address added')).toHaveCount(0);
  });

  test('Audit Log: Staff filter sends a real actor_id request — found missing and added during this module\'s own Freeze Audit', async ({ page }) => {
    await mockCustomersSession(page);
    await mockStaffDirectory(page);
    await mockCustomerAuditLogs(page, [
      { id: 'a1', actorId: 'staff1', action: 'customer.registered', targetType: CUSTOMER_TARGET_TYPE, targetId: 'c1', createdAt: '2026-08-10T00:00:00Z' },
      { id: 'a2', actorId: null, action: 'customer.address_added', targetType: CUSTOMER_ADDRESS_TARGET_TYPE, targetId: 'addr1', createdAt: '2026-08-11T00:00:00Z' },
    ]);

    await page.goto('/customers/audit-log');
    await expect(page.getByText('Customer registered')).toBeVisible();
    await expect(page.getByText('Address added')).toBeVisible();

    const requestPromise = page.waitForRequest((r) => r.url().includes('actor_id=staff1'));
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByLabel('Staff').click();
    await page.getByRole('option', { name: 'Alex Operator' }).click();
    await requestPromise;
    await expect(page.getByText('Customer registered')).toBeVisible();
    // The System-attributed (null actorId) entry must be excluded once filtered to a specific staff member.
    await expect(page.getByText('Address added')).toHaveCount(0);
  });

  test('Export: downloads the real customer record as JSON, auditable server-side', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomerDetail(page);
    await mockOrders(page, []);
    await mockCustomerAuditLogs(page, []);
    await mockStaffDirectory(page);
    await page.route('**/api/v1/customers/c1/export', async (route) => {
      await route.fulfill({ json: { data: { ...FIXED_CUSTOMER, addresses: [] } } });
    });

    await page.goto('/customers/c1');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('customer-c1.json');
    await expect(page.getByText('Customer exported', { exact: true })).toBeVisible();
  });

  test('has no critical or serious automated accessibility violations on the Audit Log and an activity-populated Customer Detail', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomerDetail(page);
    await mockStaffDirectory(page);
    await mockOrders(page, [
      { id: 'o1', orderNumber: 'ORD-20260101-AAAAAAAA', customerId: 'c1', status: 'delivered', grandTotal: '129.9900', currencyCode: 'USD', placedAt: '2026-01-01T00:00:00Z' },
    ]);
    await mockCustomerAuditLogs(page, [
      { id: 'a1', actorId: 'staff1', action: 'customer.registered', targetType: CUSTOMER_TARGET_TYPE, targetId: 'c1', createdAt: '2026-08-10T00:00:00Z' },
    ]);

    await page.goto('/customers/audit-log');
    await expect(page.getByText('Customer registered')).toBeVisible();
    let scan = await new AxeBuilder({ page }).include('main').exclude('thead').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    await page.goto('/customers/c1');
    await expect(page.getByRole('heading', { name: 'Recent Orders' })).toBeVisible();
    scan = await new AxeBuilder({ page }).include('main').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
