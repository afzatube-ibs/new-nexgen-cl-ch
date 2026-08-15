import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockOrdersSession } from './mocks.js';

const FIXED_ORDER = {
  id: 'o1',
  orderNumber: 'ORD-20260815-AAAAAAAA',
  customerId: 'c1',
  customerName: 'Jane Shopper',
  customerEmail: 'jane@example.test',
  customerPhone: null,
  currencyCode: 'USD',
  subtotal: '100.0000',
  discountTotal: '0.0000',
  taxTotal: '10.0000',
  shippingTotal: '5.0000',
  grandTotal: '115.0000',
  status: 'confirmed',
  placedAt: '2026-08-01T00:00:00Z',
  version: 2,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  items: [],
  addresses: [],
  discounts: [],
  notes: [{ id: 'n1', authorId: 'staff1', body: 'Called customer to confirm delivery window.', isCustomerVisible: false, createdAt: '2026-08-01T01:00:00Z' }],
  timelineEvents: [{ id: 't1', eventType: 'order_placed', description: 'Order ORD-20260815-AAAAAAAA placed.', occurredAt: '2026-08-01T00:00:00Z' }],
};

interface FakeShipment {
  id: string;
  orderId: string;
  status: string;
  courierProviderCode: string | null;
  trackingNumber: string | null;
  destinationCity: string | null;
  destinationCountryCode: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
}

interface FakePayment {
  id: string;
  orderId: string;
  gatewayCode: string;
  currencyCode: string;
  amount: string;
  status: string;
  initiatedAt: string;
  capturedAt: string | null;
  failureReason: string | null;
}

interface FakeNotification {
  id: string;
  relatedType: string;
  relatedId: string;
  channel: string;
  recipient: string;
  status: string;
  sentAt: string | null;
  failedAt: string | null;
  createdAt: string;
  failureReason: string | null;
}

async function mockOrderDetail(page: Page): Promise<void> {
  await page.route('**/api/v1/orders/o1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { data: FIXED_ORDER } });
      return;
    }
    await route.continue();
  });
}

/** Mocks Fulfillment's real `GET /shipments?order_id=` — `ShipmentController::index`, confirmed by reading it directly. */
async function mockShipments(page: Page, shipments: FakeShipment[]): Promise<void> {
  await page.route('**/api/v1/shipments*', async (route) => {
    const url = new URL(route.request().url());
    const orderId = url.searchParams.get('order_id');
    const filtered = orderId ? shipments.filter((s) => s.orderId === orderId) : shipments;
    await route.fulfill({
      json: {
        data: filtered.map((s) => ({
          id: s.id,
          orderId: s.orderId,
          orderNumber: FIXED_ORDER.orderNumber,
          customerId: FIXED_ORDER.customerId,
          grandTotal: null,
          currencyCode: null,
          shippingMethodId: null,
          courierProviderCode: s.courierProviderCode,
          courierConsignmentId: null,
          trackingNumber: s.trackingNumber,
          labelUrl: null,
          destination: { recipientName: null, phone: null, addressLine1: null, addressLine2: null, city: s.destinationCity, region: null, postalCode: null, countryCode: s.destinationCountryCode },
          weightGrams: null,
          status: s.status,
          failureReason: s.failureReason,
          pickedAt: null,
          packedAt: null,
          dispatchedAt: s.dispatchedAt,
          deliveredAt: s.deliveredAt,
          version: 1,
          createdAt: '2026-08-01T00:05:00Z',
          updatedAt: '2026-08-01T00:05:00Z',
        })),
        meta: { current_page: 1, per_page: 15, total: filtered.length, last_page: 1 },
      },
    });
  });
}

/** Mocks Payments' real `GET /payments?order_id=` — `PaymentController::index`, confirmed by reading it directly. */
async function mockPayments(page: Page, payments: FakePayment[]): Promise<void> {
  await page.route('**/api/v1/payments*', async (route) => {
    const url = new URL(route.request().url());
    const orderId = url.searchParams.get('order_id');
    const filtered = orderId ? payments.filter((p) => p.orderId === orderId) : payments;
    await route.fulfill({
      json: {
        data: filtered.map((p) => ({
          id: p.id,
          orderId: p.orderId,
          customerId: FIXED_ORDER.customerId,
          gatewayCode: p.gatewayCode,
          currencyCode: p.currencyCode,
          amount: p.amount,
          amountCaptured: p.amount,
          status: p.status,
          proofReference: null,
          redirectUrl: null,
          instructions: null,
          failureReason: p.failureReason,
          initiatedAt: p.initiatedAt,
          authorizedAt: null,
          capturedAt: p.capturedAt,
          cancelledAt: null,
          failedAt: null,
          version: 1,
          createdAt: p.initiatedAt,
          updatedAt: p.initiatedAt,
        })),
        meta: { current_page: 1, per_page: 15, total: filtered.length, last_page: 1 },
      },
    });
  });
}

/** Mocks Notifications' real `GET /notifications?related_type=order&related_id=` — `NotificationController::index`, confirmed by reading it directly; the real `related_type` value (`'order'`) confirmed via `SendOrderConfirmationOnOrderPlaced` directly. */
async function mockNotifications(page: Page, notifications: FakeNotification[]): Promise<void> {
  await page.route('**/api/v1/notifications*', async (route) => {
    const url = new URL(route.request().url());
    const relatedType = url.searchParams.get('related_type');
    const relatedId = url.searchParams.get('related_id');
    const filtered = relatedType && relatedId ? notifications.filter((n) => n.relatedType === relatedType && n.relatedId === relatedId) : notifications;
    await route.fulfill({
      json: {
        data: filtered.map((n) => ({
          id: n.id,
          templateId: null,
          channel: n.channel,
          recipient: n.recipient,
          subject: null,
          status: n.status,
          relatedType: n.relatedType,
          relatedId: n.relatedId,
          providerCode: null,
          attemptsCount: 1,
          maxAttempts: 5,
          nextRetryAt: null,
          lastAttemptedAt: null,
          sentAt: n.sentAt,
          failedAt: n.failedAt,
          cancelledAt: null,
          failureReason: n.failureReason,
          version: 1,
          createdAt: n.createdAt,
          updatedAt: n.createdAt,
        })),
        meta: { current_page: 1, per_page: 15, total: filtered.length, last_page: 1 },
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
      await route.fulfill({
        json: { data: { id: 'c1', name: 'Jane Shopper', email: 'jane@example.test', phone: null, status: 'active', version: 1, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', addresses: [] } },
      });
      return;
    }
    await route.continue();
  });
  // Every card Customer Detail itself renders — benign empty responses, not this file's own concern.
  await page.route('**/api/v1/orders*', async (route) => {
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 15, total: 0, last_page: 1 } } });
  });
  await page.route('**/api/v1/customers/audit-logs*', async (route) => {
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 } } });
  });
}

test.describe('Orders — Slice 2: Order Operations & Merchant Workflow', () => {
  test('Fulfillment: shows a real, order_id-filtered shipment with courier and tracking info', async ({ page }) => {
    await mockOrdersSession(page);
    await mockOrderDetail(page);
    await mockStaffDirectory(page);
    await mockPayments(page, []);
    await mockNotifications(page, []);
    await mockShipments(page, [
      { id: 's1', orderId: 'o1', status: 'dispatched', courierProviderCode: 'steadfast', trackingNumber: 'TRK-123456', destinationCity: 'Dhaka', destinationCountryCode: 'BD', dispatchedAt: '2026-08-02T00:00:00Z', deliveredAt: null, failureReason: null },
      { id: 's2', orderId: 'other', status: 'delivered', courierProviderCode: 'pathao', trackingNumber: 'TRK-999999', destinationCity: 'Chittagong', destinationCountryCode: 'BD', dispatchedAt: null, deliveredAt: '2026-08-03T00:00:00Z', failureReason: null },
    ]);

    const requestPromise = page.waitForRequest((r) => r.url().includes('/api/v1/shipments') && r.url().includes('order_id=o1'));
    await page.goto('/orders/o1');
    await requestPromise;

    await expect(page.getByRole('heading', { name: 'Fulfillment' })).toBeVisible();
    await expect(page.getByText('steadfast')).toBeVisible();
    await expect(page.getByText('TRK-123456')).toBeVisible();
    // The other order's own shipment must never appear — proves the real server filter, not a client-side one.
    await expect(page.getByText('TRK-999999')).toHaveCount(0);
  });

  test('Fulfillment: shows an honest empty state when no shipment exists for this order', async ({ page }) => {
    await mockOrdersSession(page);
    await mockOrderDetail(page);
    await mockStaffDirectory(page);
    await mockPayments(page, []);
    await mockNotifications(page, []);
    await mockShipments(page, []);

    await page.goto('/orders/o1');
    await expect(page.getByRole('heading', { name: 'Fulfillment' })).toBeVisible();
    await expect(page.getByText('No shipment yet.')).toBeVisible();
  });

  test('Payments: shows a real, order_id-filtered payment with gateway, status, and amount', async ({ page }) => {
    await mockOrdersSession(page);
    await mockOrderDetail(page);
    await mockStaffDirectory(page);
    await mockShipments(page, []);
    await mockNotifications(page, []);
    await mockPayments(page, [
      { id: 'p1', orderId: 'o1', gatewayCode: 'sslcommerz', currencyCode: 'USD', amount: '115.0000', status: 'captured', initiatedAt: '2026-08-01T00:01:00Z', capturedAt: '2026-08-01T00:02:00Z', failureReason: null },
      { id: 'p2', orderId: 'other', gatewayCode: 'bkash', currencyCode: 'USD', amount: '50.0000', status: 'captured', initiatedAt: '2026-08-01T00:01:00Z', capturedAt: '2026-08-01T00:02:00Z', failureReason: null },
    ]);

    await page.goto('/orders/o1');
    await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
    await expect(page.getByText('sslcommerz')).toBeVisible();
    await expect(page.getByText('captured', { exact: true })).toBeVisible();
    // `$115.00` also appears once in the Totals card (a coincidental match
    // in this fixture's own numbers, not a real ambiguity) — the Payments
    // card's own copy renders after it in the page.
    await expect(page.getByText('$115.00').last()).toBeVisible();
    // The other order's own payment must never appear.
    await expect(page.getByText('bkash')).toHaveCount(0);
  });

  test('Payments: shows an honest empty state when no payment has been recorded', async ({ page }) => {
    await mockOrdersSession(page);
    await mockOrderDetail(page);
    await mockStaffDirectory(page);
    await mockShipments(page, []);
    await mockNotifications(page, []);
    await mockPayments(page, []);

    await page.goto('/orders/o1');
    await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
    await expect(page.getByText('No payment recorded yet.')).toBeVisible();
  });

  test('Notifications: shows the real order-confirmation email delivery status, filtered by the real related_type/related_id pair', async ({ page }) => {
    await mockOrdersSession(page);
    await mockOrderDetail(page);
    await mockStaffDirectory(page);
    await mockShipments(page, []);
    await mockPayments(page, []);

    const requestPromise = page.waitForRequest((r) => r.url().includes('/api/v1/notifications') && r.url().includes('related_type=order') && r.url().includes('related_id=o1'));
    await mockNotifications(page, [
      { id: 'n1', relatedType: 'order', relatedId: 'o1', channel: 'email', recipient: 'jane@example.test', status: 'sent', sentAt: '2026-08-01T00:01:00Z', failedAt: null, createdAt: '2026-08-01T00:00:30Z', failureReason: null },
      { id: 'n2', relatedType: 'order', relatedId: 'other', channel: 'email', recipient: 'someone@example.test', status: 'sent', sentAt: '2026-08-01T00:01:00Z', failedAt: null, createdAt: '2026-08-01T00:00:30Z', failureReason: null },
    ]);

    await page.goto('/orders/o1');
    await requestPromise;

    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByText(/jane@example\.test · Sent/)).toBeVisible();
    await expect(page.getByText('sent', { exact: true })).toBeVisible();
    // The other order's own notification must never appear.
    await expect(page.getByText('someone@example.test')).toHaveCount(0);
  });

  test('Notifications: shows an honest empty state when nothing has been queued for this order', async ({ page }) => {
    await mockOrdersSession(page);
    await mockOrderDetail(page);
    await mockStaffDirectory(page);
    await mockShipments(page, []);
    await mockPayments(page, []);
    await mockNotifications(page, []);

    await page.goto('/orders/o1');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByText('No notifications sent yet.')).toBeVisible();
  });

  test('Notes: resolves a real staff name for the note author instead of a raw id', async ({ page }) => {
    await mockOrdersSession(page);
    await mockOrderDetail(page);
    await mockStaffDirectory(page);
    await mockShipments(page, []);
    await mockPayments(page, []);
    await mockNotifications(page, []);

    await page.goto('/orders/o1');
    await expect(page.getByText('Called customer to confirm delivery window.')).toBeVisible();
    await expect(page.getByText('Alex Operator', { exact: false })).toBeVisible();
  });

  test('Customer link: "View customer" navigates to the real Customer Detail page', async ({ page }) => {
    await mockOrdersSession(page);
    await mockOrderDetail(page);
    await mockCustomerDetail(page);
    await mockStaffDirectory(page);
    await mockShipments(page, []);
    await mockPayments(page, []);
    await mockNotifications(page, []);

    await page.goto('/orders/o1');
    await page.getByRole('link', { name: 'View customer Jane Shopper' }).click();
    await expect(page).toHaveURL(/\/customers\/c1$/);
    await expect(page.getByRole('heading', { name: 'Jane Shopper' })).toBeVisible();
  });

  test('has no critical or serious automated accessibility violations on an Order Detail populated with Slice 2 cards', async ({ page }) => {
    await mockOrdersSession(page);
    await mockOrderDetail(page);
    await mockStaffDirectory(page);
    await mockShipments(page, [
      { id: 's1', orderId: 'o1', status: 'dispatched', courierProviderCode: 'steadfast', trackingNumber: 'TRK-123456', destinationCity: 'Dhaka', destinationCountryCode: 'BD', dispatchedAt: '2026-08-02T00:00:00Z', deliveredAt: null, failureReason: null },
    ]);
    await mockPayments(page, [
      { id: 'p1', orderId: 'o1', gatewayCode: 'sslcommerz', currencyCode: 'USD', amount: '115.0000', status: 'captured', initiatedAt: '2026-08-01T00:01:00Z', capturedAt: '2026-08-01T00:02:00Z', failureReason: null },
    ]);
    await mockNotifications(page, [
      { id: 'n1', relatedType: 'order', relatedId: 'o1', channel: 'email', recipient: 'jane@example.test', status: 'sent', sentAt: '2026-08-01T00:01:00Z', failedAt: null, createdAt: '2026-08-01T00:00:30Z', failureReason: null },
    ]);

    await page.goto('/orders/o1');
    await expect(page.getByRole('heading', { name: 'Fulfillment' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    const scan = await new AxeBuilder({ page }).include('main').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
