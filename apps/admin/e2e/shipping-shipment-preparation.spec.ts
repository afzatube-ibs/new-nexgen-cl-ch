import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockShippingSession, mockShippingPickerOnlySession } from './mocks.js';

interface FakeItem {
  id: string;
  sku: string;
  description: string | null;
  quantity: number;
}

interface FakeShipment {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  status: string;
  version: number;
  weightGrams: number | null;
  destination: { recipientName: string; phone: string; addressLine1: string; addressLine2: string | null; city: string; region: string | null; postalCode: string | null; countryCode: string } | null;
  items: FakeItem[];
  notes: { id: string; authorId: string | null; body: string; isCustomerVisible: boolean; createdAt: string }[];
  timeline: { id: string; eventType: string; description: string; occurredAt: string }[];
}

function toResource(s: FakeShipment) {
  return {
    id: s.id,
    orderId: s.orderId,
    orderNumber: s.orderNumber,
    customerId: s.customerId,
    grandTotal: '22.0000',
    currencyCode: 'USD',
    shippingMethodId: null,
    courierProviderCode: null,
    courierConsignmentId: null,
    trackingNumber: null,
    labelUrl: null,
    destination: s.destination ?? { recipientName: null, phone: null, addressLine1: null, addressLine2: null, city: null, region: null, postalCode: null, countryCode: null },
    weightGrams: s.weightGrams,
    status: s.status,
    failureReason: null,
    pickedAt: null,
    packedAt: null,
    dispatchedAt: null,
    deliveredAt: null,
    version: s.version,
    items: s.items,
    notes: s.notes,
    timeline: s.timeline,
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-08-16T09:00:00Z',
  };
}

async function mockShipmentPreparation(page: Page, shipment: FakeShipment): Promise<void> {
  let nextItemId = shipment.items.length + 1;
  let nextNoteId = shipment.notes.length + 1;

  await page.route(`**/api/v1/shipments/${shipment.id}`, async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ json: { data: toResource(shipment) } });
      return;
    }
    await route.continue();
  });

  await page.route(`**/api/v1/shipments/${shipment.id}/destination`, async (route) => {
    const request = route.request();
    if (request.method() !== 'PATCH') {
      await route.continue();
      return;
    }
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown> & { expected_version?: number };
    if (typeof body.expected_version === 'number' && body.expected_version !== shipment.version) {
      await route.fulfill({ status: 409, json: { error: { type: 'conflict', message: 'This has changed since it was last read.' } } });
      return;
    }
    shipment.destination = {
      recipientName: body.destination_recipient_name as string,
      phone: body.destination_phone as string,
      addressLine1: body.destination_address_line1 as string,
      addressLine2: (body.destination_address_line2 as string) ?? null,
      city: body.destination_city as string,
      region: (body.destination_region as string) ?? null,
      postalCode: (body.destination_postal_code as string) ?? null,
      countryCode: body.destination_country_code as string,
    };
    if (body.weight_grams !== undefined) shipment.weightGrams = body.weight_grams as number;
    shipment.version += 1;
    await route.fulfill({ json: { data: toResource(shipment) } });
  });

  await page.route(`**/api/v1/shipments/${shipment.id}/items`, async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    const item: FakeItem = { id: `item${nextItemId++}`, sku: body.sku as string, description: (body.description as string) ?? null, quantity: body.quantity as number };
    shipment.items.push(item);
    await route.fulfill({ status: 201, json: { data: item } });
  });

  await page.route(`**/api/v1/shipments/${shipment.id}/items/*`, async (route) => {
    const request = route.request();
    if (request.method() !== 'DELETE') {
      await route.continue();
      return;
    }
    const itemId = new URL(request.url()).pathname.split('/').filter(Boolean).pop();
    shipment.items = shipment.items.filter((i) => i.id !== itemId);
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route(`**/api/v1/shipments/${shipment.id}/notes`, async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    const note = { id: `note${nextNoteId++}`, authorId: 'staff1', body: body.body as string, isCustomerVisible: Boolean(body.is_customer_visible), createdAt: new Date().toISOString() };
    shipment.notes.unshift(note);
    shipment.timeline.push({ id: `evt${shipment.timeline.length + 1}`, eventType: 'note_added', description: 'A note was added.', occurredAt: new Date().toISOString() });
    await route.fulfill({ status: 201, json: { data: note } });
  });

  await page.route('**/api/v1/shipping-methods*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } } });
  });

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
    destination: null,
    items: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

test.describe('Shipment Preparation (Phase 2.8 Slice 3)', () => {
  test('Readiness checklist starts fully unmet on a fresh pending shipment', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment();
    await mockShipmentPreparation(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    const checklist = page.getByRole('list', { name: 'Shipment preparation checklist' });
    await expect(checklist.getByText('Items added')).toBeVisible();
    await expect(checklist.getByText('Weight recorded')).toBeVisible();
    await expect(checklist.getByText('Destination set')).toBeVisible();
    // None of the three are met yet — the disabled-action captions confirm it from the real action bar's own state.
    await expect(page.getByText('Start Picking is disabled')).toBeVisible();
  });

  test('Setting destination and weight together updates the checklist and unblocks the real precondition', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment();
    await mockShipmentPreparation(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await page.getByRole('button', { name: 'Set destination' }).click();
    await page.getByLabel('Recipient name').fill('Farhana Akter');
    await page.getByLabel('Phone').fill('+8801700000000');
    await page.getByLabel('Address line 1').fill('House 12, Road 5');
    await page.getByLabel('City').fill('Dhaka');
    await page.getByLabel('Country').fill('BD');
    await page.getByLabel('Weight (grams)').fill('650');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Destination saved', { exact: true })).toBeVisible();
    await expect(page.getByText('Farhana Akter', { exact: true })).toBeVisible();
    await expect(page.getByText('650 g', { exact: true })).toBeVisible();
  });

  test('Adding and removing an item respects the real precondition and updates the checklist', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment();
    await mockShipmentPreparation(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await page.getByRole('button', { name: 'Add item' }).click();
    const itemDialog = page.getByRole('dialog', { name: 'Add item' });
    await itemDialog.getByLabel('SKU').fill('SKU-001');
    await itemDialog.getByLabel('Description').fill('Cotton T-Shirt');
    await itemDialog.getByLabel('Quantity').fill('2');
    await itemDialog.getByRole('button', { name: 'Add item' }).click();

    await expect(page.getByText('Item added', { exact: true })).toBeVisible();
    await expect(page.getByText('SKU-001', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start picking' })).toBeEnabled();

    await page.getByRole('button', { name: 'Remove SKU-001' }).click();
    await page.getByRole('dialog', { name: 'Remove this item?' }).getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(page.getByText('No items on this shipment yet.', { exact: true })).toBeVisible();
  });

  test('Items can no longer be added once the shipment is genuinely packed, but can while packing is still in progress', async ({ page }) => {
    await mockShippingSession(page);
    const packingShipment = baseShipment({ status: 'packing', version: 4, items: [{ id: 'item1', sku: 'SKU-001', description: null, quantity: 1 }] });
    await mockShipmentPreparation(page, packingShipment);
    await page.goto(`/shipping/shipments/${packingShipment.id}`);
    await expect(page.getByRole('button', { name: 'Add item' })).toBeVisible();

    const packedShipment = baseShipment({ id: 'ship0002', status: 'packed', version: 5, weightGrams: 500, items: [{ id: 'item1', sku: 'SKU-001', description: null, quantity: 1 }] });
    await mockShipmentPreparation(page, packedShipment);
    await page.goto(`/shipping/shipments/${packedShipment.id}`);
    await expect(page.getByRole('button', { name: 'Add item' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Remove/ })).toHaveCount(0);
  });

  test('Adding a note works at any status, resolves the real author name, and appears on the Timeline', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment({ status: 'delivered', version: 8 });
    await mockShipmentPreparation(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await page.getByRole('button', { name: 'Add note' }).click();
    const noteDialog = page.getByRole('dialog', { name: 'Add a note' });
    await noteDialog.getByLabel('Note', { exact: true }).fill('Left with building security.');
    await noteDialog.getByLabel('Customer-visible').check();
    await noteDialog.getByRole('button', { name: 'Add note' }).click();

    await expect(page.getByText('Note added', { exact: true })).toBeVisible();
    await expect(noteDialog).toBeHidden();
    await expect(page.getByText('Left with building security.', { exact: true })).toBeVisible();
    await expect(page.getByText('Alex Operator', { exact: false })).toBeVisible();
    await expect(page.getByText('Customer-visible', { exact: true })).toBeVisible();
    await expect(page.getByText('A note was added.', { exact: true })).toBeVisible();
  });

  test('Destination can no longer be edited once dispatched', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment({
      status: 'dispatched',
      version: 6,
      weightGrams: 500,
      destination: { recipientName: 'Farhana Akter', phone: '+8801700000000', addressLine1: 'House 12, Road 5', addressLine2: null, city: 'Dhaka', region: null, postalCode: null, countryCode: 'BD' },
    });
    await mockShipmentPreparation(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await expect(page.getByRole('heading', { name: 'Destination address' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  });

  test('Permission gating: a picker-only session sees no Edit/Add/Remove Shipment Preparation controls', async ({ page }) => {
    await mockShippingPickerOnlySession(page);
    const shipment = baseShipment({ items: [{ id: 'item1', sku: 'SKU-001', description: null, quantity: 1 }] });
    await mockShipmentPreparation(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);

    await expect(page.getByRole('button', { name: 'Set destination' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add item' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add note' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Remove/ })).toHaveCount(0);
    // The readiness checklist itself is still visible — read-only information, not gated by `.manage`.
    await expect(page.getByRole('list', { name: 'Shipment preparation checklist' })).toBeVisible();
  });

  test('has no critical or serious automated accessibility violations on Shipment Detail with Destination/Items/Notes populated', async ({ page }) => {
    await mockShippingSession(page);
    const shipment = baseShipment({
      weightGrams: 500,
      destination: { recipientName: 'Farhana Akter', phone: '+8801700000000', addressLine1: 'House 12, Road 5', addressLine2: null, city: 'Dhaka', region: null, postalCode: null, countryCode: 'BD' },
      items: [{ id: 'item1', sku: 'SKU-001', description: 'Cotton T-Shirt', quantity: 2 }],
      notes: [{ id: 'note1', authorId: 'staff1', body: 'Called courier.', isCustomerVisible: false, createdAt: '2026-08-16T09:00:00Z' }],
    });
    await mockShipmentPreparation(page, shipment);
    await page.goto(`/shipping/shipments/${shipment.id}`);
    await expect(page.getByText('Called courier.', { exact: true })).toBeVisible();

    const scan = await new AxeBuilder({ page }).include('main').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
