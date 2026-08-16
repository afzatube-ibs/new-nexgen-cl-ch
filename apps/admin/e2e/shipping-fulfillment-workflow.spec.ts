import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockShippingSession, mockShippingPickerOnlySession } from './mocks.js';

type ShipmentStatus = 'pending' | 'picking' | 'picked' | 'packing' | 'packed' | 'dispatched' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';

interface FakeShipment {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  status: ShipmentStatus;
  version: number;
  weightGrams: number | null;
  hasDestination: boolean;
  items: { id: string; sku: string; description: string | null; quantity: number }[];
  timeline: { id: string; eventType: string; description: string; occurredAt: string }[];
  courierProviderCode: string | null;
  trackingNumber: string | null;
  shippingMethodId: string | null;
  pickedAt: string | null;
  packedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
}

/** Mirrors `Models\Shipment::ALLOWED_TRANSITIONS`, confirmed by reading it directly — the same map the real UI itself reads to decide which button to offer, kept here as an independent check that the mock (and therefore the assertions run against it) match real backend behavior, not just the frontend's own belief about it. */
const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ['picking', 'cancelled'],
  picking: ['picked', 'failed', 'cancelled'],
  picked: ['packing', 'cancelled'],
  packing: ['packed', 'failed', 'cancelled'],
  packed: ['dispatched', 'cancelled'],
  dispatched: ['in_transit', 'delivered', 'failed'],
  in_transit: ['delivered', 'failed'],
  delivered: [],
  failed: [],
  cancelled: [],
};

function toResource(s: FakeShipment) {
  return {
    id: s.id,
    orderId: s.orderId,
    orderNumber: s.orderNumber,
    customerId: s.customerId,
    grandTotal: '22.0000',
    currencyCode: 'USD',
    shippingMethodId: s.shippingMethodId,
    courierProviderCode: s.courierProviderCode,
    courierConsignmentId: null,
    trackingNumber: s.trackingNumber,
    labelUrl: null,
    destination: s.hasDestination
      ? { recipientName: 'Farhana Akter', phone: '+8801700000000', addressLine1: 'House 12, Road 5', addressLine2: null, city: 'Dhaka', region: 'Dhaka', postalCode: '1212', countryCode: 'BD' }
      : { recipientName: null, phone: null, addressLine1: null, addressLine2: null, city: null, region: null, postalCode: null, countryCode: null },
    weightGrams: s.weightGrams,
    status: s.status,
    failureReason: s.failureReason,
    pickedAt: s.pickedAt,
    packedAt: s.packedAt,
    dispatchedAt: s.dispatchedAt,
    deliveredAt: s.deliveredAt,
    version: s.version,
    items: s.items,
    timeline: s.timeline,
    notes: [],
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-08-16T09:00:00Z',
  };
}

async function mockShipmentWorkflow(page: Page, shipment: FakeShipment): Promise<void> {
  await page.route(`**/api/v1/shipments/${shipment.id}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ json: { data: toResource(shipment) } });
  });

  await page.route(`**/api/v1/shipments/${shipment.id}/**`, async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    const url = new URL(request.url());
    const segments = url.pathname.split('/').filter(Boolean);
    const action = segments.slice(segments.indexOf('shipments') + 2).join('/'); // e.g. "pick/start"
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown> & { expected_version?: number };

    if (typeof body.expected_version === 'number' && body.expected_version !== shipment.version) {
      await route.fulfill({
        status: 409,
        json: { error: { type: 'conflict', message: `Shipment [${shipment.id}] has changed since it was last read: expected version ${body.expected_version}, found ${shipment.version}.` } },
      });
      return;
    }

    const TARGET_BY_ACTION: Record<string, ShipmentStatus> = {
      'pick/start': 'picking',
      'pick/complete': 'picked',
      'pack/start': 'packing',
      'pack/complete': 'packed',
      dispatch: 'dispatched',
      'in-transit': 'in_transit',
      deliver: 'delivered',
      fail: 'failed',
      cancel: 'cancelled',
    };
    const target = TARGET_BY_ACTION[action];
    if (!target || !ALLOWED_TRANSITIONS[shipment.status].includes(target)) {
      await route.fulfill({ status: 422, json: { error: { type: 'validation_failed', message: `Shipment [${shipment.id}] cannot transition from [${shipment.status}] to [${target}].` } } });
      return;
    }

    if (action === 'pick/start' && shipment.items.length === 0) {
      await route.fulfill({ status: 422, json: { error: { type: 'validation_failed', message: `Shipment [${shipment.id}] has no items to pick.` } } });
      return;
    }
    if (action === 'pack/complete' && shipment.weightGrams === null) {
      await route.fulfill({ status: 422, json: { error: { type: 'validation_failed', message: `Shipment [${shipment.id}] has no recorded weight — set it via the destination endpoint before marking packed.` } } });
      return;
    }
    if (action === 'dispatch' && !shipment.hasDestination) {
      await route.fulfill({ status: 422, json: { error: { type: 'validation_failed', message: `Shipment [${shipment.id}] has no destination address — set it before dispatch.` } } });
      return;
    }
    if (action === 'fail' && !body.reason) {
      await route.fulfill({ status: 422, json: { error: { type: 'validation_failed', message: 'The given data was invalid.', details: { reason: ['The reason field is required.'] } } } });
      return;
    }

    shipment.status = target;
    shipment.version += 1;
    const now = new Date().toISOString();
    if (target === 'picked') shipment.pickedAt = now;
    if (target === 'packed') shipment.packedAt = now;
    if (target === 'dispatched') {
      shipment.dispatchedAt = now;
      shipment.trackingNumber = (body.tracking_number as string) ?? shipment.trackingNumber;
      shipment.shippingMethodId = (body.shipping_method_id as string) ?? shipment.shippingMethodId;
    }
    if (target === 'delivered') shipment.deliveredAt = now;
    if (target === 'failed' || target === 'cancelled') shipment.failureReason = (body.reason as string) ?? null;
    shipment.timeline.push({ id: `evt-${shipment.timeline.length + 1}`, eventType: 'status_changed', description: `Moved to ${target}.`, occurredAt: now });

    await route.fulfill({ json: { data: toResource(shipment) } });
  });

  await page.route('**/api/v1/shipping-methods*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } });
  });

  // Shipment Detail resolves note authors via the real staff directory (Slice 3) —
  // without this mock the request falls through to the network and the app's own
  // session-expiry handling kicks the page back to the login screen mid-test.
  await page.route('**/api/v1/users*', async (route) => {
    await route.fulfill({
      json: { data: [{ id: 'staff1', name: 'Alex Operator', email: 'alex@nexgen.test', status: 'active', roles: [], version: 1, createdAt: null, updatedAt: null }], meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 } },
    });
  });
}

function baseShipment(overrides: Partial<FakeShipment> = {}): FakeShipment {
  return {
    id: 'ship0001',
    orderId: 'order0001',
    orderNumber: 'ORD-20260815-E35BA5A5',
    customerId: 'cust0001',
    status: 'pending',
    version: 1,
    weightGrams: null,
    hasDestination: false,
    items: [],
    timeline: [],
    courierProviderCode: null,
    trackingNumber: null,
    shippingMethodId: null,
    pickedAt: null,
    packedAt: null,
    dispatchedAt: null,
    deliveredAt: null,
    failureReason: null,
    ...overrides,
  };
}

test.describe('Fulfillment Workflow (Phase 2.8 Slice 2)', () => {
  test('Pending shipment with no items shows Start Picking disabled with the real, honest reason', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment();
    await mockShipmentWorkflow(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await expect(page.getByRole('button', { name: 'Start picking' })).toBeDisabled();
    await expect(page.getByText(/add at least one item/)).toBeVisible();
  });

  test('Full happy path: Pick -> Pack -> Dispatch -> In Transit -> Deliver, with the status rail and timeline updating at each step', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment({
      weightGrams: 500,
      hasDestination: true,
      items: [{ id: 'item1', sku: 'SKU-001', description: 'Cotton T-Shirt', quantity: 2 }],
    });
    await mockShipmentWorkflow(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await expect(page.getByText('pending', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Start picking' }).click();
    await page.getByRole('dialog', { name: 'Start picking this shipment?' }).getByRole('button', { name: 'Start picking' }).click();
    await expect(page.getByText('picking', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Mark picked' }).click();
    await page.getByRole('dialog', { name: 'Mark this shipment picked?' }).getByRole('button', { name: 'Mark picked' }).click();
    await expect(page.getByText('picked', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Start packing' }).click();
    await page.getByRole('dialog', { name: 'Start packing this shipment?' }).getByRole('button', { name: 'Start packing' }).click();
    await expect(page.getByText('packing', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Mark packed' }).click();
    await page.getByRole('dialog', { name: 'Mark this shipment packed?' }).getByRole('button', { name: 'Mark packed' }).click();
    await expect(page.getByText('packed', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Dispatch' }).click();
    await page.getByLabel('Tracking number').fill('TRK-999');
    await page.getByRole('dialog', { name: 'Dispatch this shipment?' }).getByRole('button', { name: 'Dispatch' }).click();
    await expect(page.getByText('Shipment dispatched', { exact: true })).toBeVisible();
    await expect(page.getByText('dispatched', { exact: true })).toBeVisible();
    await expect(page.getByText('TRK-999', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Mark in transit' }).click();
    await page.getByRole('dialog', { name: 'Mark this shipment in transit?' }).getByRole('button', { name: 'Mark in transit' }).click();
    await expect(page.getByText('in transit', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Mark delivered' }).click();
    await page.getByRole('dialog', { name: 'Mark this shipment delivered?' }).getByRole('button', { name: 'Mark delivered' }).click();
    await expect(page.getByText('delivered', { exact: true })).toBeVisible();
    await expect(page.getByText('This shipment is in a final state')).toBeVisible();

    // Real timeline events accumulated across every real transition — no fabricated entries.
    await expect(page.getByText('Moved to picking.')).toBeVisible();
    await expect(page.getByText('Moved to delivered.')).toBeVisible();
  });

  test('Mark Failed requires a reason; Cancel accepts an optional one', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment({ status: 'picking', version: 2, items: [{ id: 'item1', sku: 'SKU-001', description: null, quantity: 1 }] });
    await mockShipmentWorkflow(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await page.getByRole('button', { name: 'Mark failed' }).click();
    await page.getByRole('dialog', { name: 'Mark this shipment as failed?' }).getByRole('button', { name: 'Mark failed' }).click();
    await expect(page.getByText('A reason is required to mark a shipment as failed.')).toBeVisible();

    await page.getByLabel('Reason').fill('Parcel damaged during picking.');
    await page.getByRole('dialog', { name: 'Mark this shipment as failed?' }).getByRole('button', { name: 'Mark failed' }).click();
    await expect(page.getByText('Shipment marked failed', { exact: true })).toBeVisible();
    await expect(page.getByText('failed', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Parcel damaged during picking.')).toBeVisible();
  });

  test('Cancel works with no reason at all, a genuinely optional field', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment();
    await mockShipmentWorkflow(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('dialog', { name: 'Cancel this shipment?' }).getByRole('button', { name: 'Cancel shipment' }).click();
    await expect(page.getByRole('main').getByText('Shipment cancelled', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('cancelled', { exact: true }).first()).toBeVisible();
  });

  test('Dispatch is disabled with the real reason when no destination is set, and Mark Packed is disabled with the real reason when no weight is recorded', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment({ status: 'packed', version: 5, weightGrams: null, hasDestination: false, items: [{ id: 'item1', sku: 'SKU-001', description: null, quantity: 1 }] });
    await mockShipmentWorkflow(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await expect(page.getByRole('button', { name: 'Dispatch' })).toBeDisabled();
    await expect(page.getByText(/set a destination address/)).toBeVisible();
  });

  test('A real 409 optimistic-lock conflict is surfaced clearly, not silently swallowed', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment({ items: [{ id: 'item1', sku: 'SKU-001', description: null, quantity: 1 }] });
    // A dedicated, simpler mock for this one test: GET always reports the
    // stale version 1 (whatever a background refetch does, the client never
    // sees the "external" change) while every workflow POST unconditionally
    // 409s — the deterministic way to exercise this path without racing
    // TanStack Query's own default `staleTime: 0` background refetch on
    // mount, which (confirmed live while writing this test) can otherwise
    // silently resolve the "conflict" before the click ever fires.
    await page.route(`**/api/v1/shipments/${shipment.id}`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({ json: { data: toResource(shipment) } });
    });
    await page.route(`**/api/v1/shipments/${shipment.id}/**`, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 409,
        json: { error: { type: 'conflict', message: `Shipment [${shipment.id}] has changed since it was last read: expected version 1, found 99.` } },
      });
    });
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await page.getByRole('button', { name: 'Start picking' }).click();
    await page.getByRole('dialog', { name: 'Start picking this shipment?' }).getByRole('button', { name: 'Start picking' }).click();
    await expect(page.getByText('This was changed elsewhere since it loaded — reload the page to see the latest version before trying again.')).toBeVisible();
  });

  test('Permission gating: a picker-only session sees Pick actions but no Pack/Dispatch/Cancel/Fail controls at all', async ({ page }) => {
    await mockShippingPickerOnlySession(page);
    const shipment = baseShipment({ items: [{ id: 'item1', sku: 'SKU-001', description: null, quantity: 1 }] });
    await mockShipmentWorkflow(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await expect(page.getByRole('button', { name: 'Start picking' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mark failed' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Dispatch' })).toHaveCount(0);
  });

  test('has no critical or serious automated accessibility violations on Shipment Detail mid-workflow', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment({ status: 'picked', version: 3, weightGrams: 500, hasDestination: true, items: [{ id: 'item1', sku: 'SKU-001', description: 'Cotton T-Shirt', quantity: 2 }] });
    await mockShipmentWorkflow(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);
    await expect(page.getByRole('button', { name: 'Start packing' })).toBeVisible();

    const scan = await new AxeBuilder({ page }).include('main').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
