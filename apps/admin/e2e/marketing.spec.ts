import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPromotionsSession, mockPromotionsViewerOnlySession } from './mocks.js';

/**
 * Phase 3.0 — Marketing, Slice 1. The real backend module is `Commerce/
 * Promotions` — see `PHASE_3_0_MARKETING_ARCHITECTURE.md`. Mirrors
 * `payments.spec.ts`'s own shape: one handler per real endpoint, network
 * fully mocked (no live backend in this environment), permission-gating
 * verified against a genuinely restricted session, and a real a11y scan.
 */

interface FakeCondition {
  id: string;
  promotionId: string;
  conditionType: string;
  referenceId: string | null;
  numericValue: string | null;
}

interface FakeCoupon {
  id: string;
  promotionId: string;
  code: string;
  usageLimitGlobal: number | null;
  usageCountGlobal: number;
  status: 'active' | 'archived';
  version: number;
}

interface FakePromotion {
  id: string;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
  discountValue: string | null;
  currencyCode: string | null;
  isStackable: boolean;
  priority: number;
  requiresCoupon: boolean;
  usageLimitGlobal: number | null;
  usageCountGlobal: number;
  status: 'active' | 'archived';
  conditions: FakeCondition[];
  coupons: FakeCoupon[];
  version: number;
}

function basePromotion(overrides: Partial<FakePromotion> = {}): FakePromotion {
  return {
    id: 'promo0001',
    name: 'Summer Sale',
    description: '10% off storewide.',
    discountType: 'percentage',
    discountValue: '10.0000',
    currencyCode: null,
    isStackable: false,
    priority: 0,
    requiresCoupon: false,
    usageLimitGlobal: null,
    usageCountGlobal: 0,
    status: 'active',
    conditions: [],
    coupons: [],
    version: 1,
    ...overrides,
  };
}

function toPromotionResource(p: FakePromotion) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    discountType: p.discountType,
    discountValue: p.discountValue,
    currencyCode: p.currencyCode,
    buyXQuantity: null,
    buyXTargetType: null,
    buyXTargetId: null,
    getYQuantity: null,
    getYTargetType: null,
    getYTargetId: null,
    getYDiscountPercentage: null,
    isStackable: p.isStackable,
    priority: p.priority,
    requiresCoupon: p.requiresCoupon,
    startsAt: null,
    endsAt: null,
    usageLimitGlobal: p.usageLimitGlobal,
    usageCountGlobal: p.usageCountGlobal,
    usageLimitPerCustomer: null,
    status: p.status,
    conditions: p.conditions,
    coupons: p.coupons,
    version: p.version,
    createdAt: '2026-08-16T09:00:00Z',
    updatedAt: '2026-08-16T09:00:00Z',
  };
}

async function mockPromotionsResource(page: Page, promotions: FakePromotion[]): Promise<void> {
  await page.route('**/api/v1/promotions?*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const url = new URL(route.request().url());
    const status = url.searchParams.get('status');
    const filtered = status ? promotions.filter((p) => p.status === status) : promotions;
    await route.fulfill({ json: { data: filtered.map(toPromotionResource), meta: { current_page: 1, per_page: 25, total: filtered.length, last_page: 1 } } });
  });

  await page.route('**/api/v1/promotions/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const segments = url.pathname.split('/').filter(Boolean);
    const id = segments.at(-1);
    const promotion = promotions.find((p) => p.id === id);

    if (request.method() === 'GET') {
      if (!promotion) return route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
      return route.fulfill({ json: { data: toPromotionResource(promotion) } });
    }
    if (request.method() === 'PATCH') {
      if (!promotion) return route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
      const body = request.postDataJSON() as Record<string, unknown>;
      Object.assign(promotion, {
        name: body.name,
        priority: body.priority,
        discountValue: (body.discount_value as string) ?? (body.discountValue as string),
        version: promotion.version + 1,
      });
      return route.fulfill({ json: { data: toPromotionResource(promotion) } });
    }
    if (request.method() === 'DELETE') {
      const idx = promotions.findIndex((p) => p.id === id);
      if (idx >= 0) promotions.splice(idx, 1);
      return route.fulfill({ status: 204, body: '' });
    }
    return route.continue();
  });

  await page.route('**/api/v1/promotions', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const created = basePromotion({
      id: `promo-new-${promotions.length + 1}`,
      name: body.name as string,
      discountType: (body.discount_type as FakePromotion['discountType']) ?? (body.discountType as FakePromotion['discountType']),
      discountValue: (body.discount_value as string) ?? (body.discountValue as string) ?? null,
      priority: (body.priority as number) ?? 0,
    });
    promotions.push(created);
    await route.fulfill({ status: 201, json: { data: toPromotionResource(created) } });
  });

  await page.route('**/api/v1/promotions/*/archive', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-2);
    const promotion = promotions.find((p) => p.id === id);
    if (!promotion) return route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
    promotion.status = 'archived';
    promotion.version += 1;
    await route.fulfill({ json: { data: toPromotionResource(promotion) } });
  });

  await page.route('**/api/v1/promotions/*/conditions', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const promotionId = new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-2);
    const promotion = promotions.find((p) => p.id === promotionId);
    if (!promotion) return route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const condition: FakeCondition = {
      id: `cond-${promotion.conditions.length + 1}`,
      promotionId: promotion.id,
      conditionType: (body.condition_type as string) ?? (body.conditionType as string),
      referenceId: (body.reference_id as string) ?? (body.referenceId as string) ?? null,
      numericValue: (body.numeric_value as string) ?? (body.numericValue as string) ?? null,
    };
    promotion.conditions.push(condition);
    promotion.version += 1;
    await route.fulfill({ status: 201, json: { data: condition } });
  });

  await page.route('**/api/v1/promotions/*/coupons', async (route) => {
    if (route.request().method() === 'POST') {
      const promotionId = new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-2);
      const promotion = promotions.find((p) => p.id === promotionId);
      if (!promotion) return route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const coupon: FakeCoupon = {
        id: `coupon-${promotion.coupons.length + 1}`,
        promotionId: promotion.id,
        code: body.code as string,
        usageLimitGlobal: (body.usage_limit_global as number) ?? (body.usageLimitGlobal as number) ?? null,
        usageCountGlobal: 0,
        status: 'active',
        version: 1,
      };
      promotion.coupons.push(coupon);
      return route.fulfill({ status: 201, json: { data: coupon } });
    }
    return route.continue();
  });
}

interface FakeAuditLog {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

async function mockPromotionsAuditLogs(page: Page, logs: FakeAuditLog[]): Promise<void> {
  await page.route('**/api/v1/promotions/audit-logs*', async (route) => {
    await route.fulfill({
      json: { data: logs.map((l) => ({ ...l, before: null, after: null, correlationId: null })), meta: { current_page: 1, per_page: 25, total: logs.length, last_page: 1 } },
    });
  });
}

interface FakeRedemption {
  id: string;
  promotionId: string;
  couponId: string | null;
  customerId: string | null;
  orderReference: string | null;
  discountAmount: string;
  currencyCode: string;
  redeemedAt: string;
}

async function mockRedemptions(page: Page, redemptions: FakeRedemption[] = []): Promise<void> {
  await page.route('**/api/v1/promotions/redemptions*', async (route) => {
    const url = new URL(route.request().url());
    const promotionId = url.searchParams.get('promotion_id');
    const customerId = url.searchParams.get('customer_id');
    const filtered = redemptions.filter((r) => (!promotionId || r.promotionId === promotionId) && (!customerId || r.customerId === customerId));
    await route.fulfill({ json: { data: filtered, meta: { current_page: 1, per_page: 25, total: filtered.length, last_page: 1 } } });
  });
}

async function mockEvaluate(page: Page, response: { appliedPromotions: unknown[]; totalDiscount: string; freeShipping: boolean }): Promise<void> {
  await page.route('**/api/v1/promotions/evaluate', async (route) => {
    await route.fulfill({ json: { data: response } });
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

test.describe('Marketing (Phase 3.0 Slice 1 — Promotions)', () => {
  test('Promotions List: lists real promotions with discount/priority/status, and filters by Status', async ({ page }) => {
    await mockPromotionsSession(page);
    await mockPromotionsResource(page, [
      basePromotion({ id: 'promo0001', name: 'Summer Sale', status: 'active' }),
      basePromotion({ id: 'promo0002', name: 'Old Winter Sale', status: 'archived' }),
    ]);
    await page.goto('/marketing/promotions');

    await expect(page.getByRole('heading', { name: 'Promotions' })).toBeVisible();
    await expect(page.getByText('Summer Sale')).toBeVisible();
    await expect(page.getByText('Old Winter Sale')).toBeVisible();

    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByLabel('Status').click();
    await page.getByRole('option', { name: 'Active' }).click();

    await expect(page.getByText('Summer Sale')).toBeVisible();
    await expect(page.getByText('Old Winter Sale')).toHaveCount(0);
  });

  test('New promotion: creates a real percentage promotion and it appears in the List', async ({ page }) => {
    await mockPromotionsSession(page);
    const promotions: FakePromotion[] = [];
    await mockPromotionsResource(page, promotions);
    await page.goto('/marketing/promotions');

    await page.getByRole('button', { name: 'New promotion' }).click();
    await page.getByLabel('Name').fill('Flash Sale');
    await page.getByLabel('Discount value (%)').fill('15');
    await page.getByRole('button', { name: 'Create promotion' }).click();

    await expect(page.getByText('Flash Sale')).toBeVisible();
  });

  test('Promotion Detail: shows Overview, Eligibility Conditions, and Coupons, and Add condition/New coupon create real child records', async ({ page }) => {
    await mockPromotionsSession(page);
    const promotion = basePromotion({ id: 'promo0001', name: 'Summer Sale' });
    await mockPromotionsResource(page, [promotion]);
    await page.goto('/marketing/promotions/promo0001');

    await expect(page.getByRole('heading', { name: 'Summer Sale' })).toBeVisible();
    await expect(page.getByText('No eligibility conditions')).toBeVisible();
    await expect(page.getByText(/This promotion doesn.t require a coupon/)).toBeVisible();

    await page.getByRole('button', { name: 'Add condition' }).click();
    await page.getByLabel('Minimum order amount').fill('50');
    await page.getByRole('dialog').getByRole('button', { name: 'Add condition' }).click();
    await expect(page.getByText('Minimum order amount: ≥ 50')).toBeVisible();

    await page.getByRole('button', { name: 'New coupon' }).click();
    await page.getByLabel('Code').fill('SUMMER10');
    await page.getByRole('dialog').getByRole('button', { name: 'Create coupon' }).click();
    await expect(page.getByText('SUMMER10')).toBeVisible();
  });

  test('Promotion Detail: Edit updates the promotion, and a fixed-precision decimal-cast value renders trimmed, not "10.0000%"', async ({ page }) => {
    await mockPromotionsSession(page);
    const promotion = basePromotion({ id: 'promo0001', name: 'Summer Sale', discountValue: '10.0000' });
    await mockPromotionsResource(page, [promotion]);
    await page.goto('/marketing/promotions/promo0001');

    await expect(page.getByText('10% off', { exact: true })).toBeVisible();
    await expect(page.getByText('10.0000% off')).toHaveCount(0);

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Priority').fill('9');
    await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('9')).toBeVisible();
  });

  test('Promotion Detail: Archive stops it applying, hides the Archive action, and Delete removes it permanently', async ({ page }) => {
    await mockPromotionsSession(page);
    const promotion = basePromotion({ id: 'promo0001', name: 'Summer Sale' });
    await mockPromotionsResource(page, [promotion]);
    await page.goto('/marketing/promotions/promo0001');

    await page.getByRole('button', { name: 'Archive' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByText('archived', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Archive' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL(/\/marketing\/promotions$/);
  });

  test('Redemptions: real, read-only history — an honest empty state when nothing has been redeemed', async ({ page }) => {
    await mockPromotionsSession(page);
    await mockRedemptions(page, []);
    await page.goto('/marketing/redemptions');

    await expect(page.getByRole('heading', { name: 'Redemptions' })).toBeVisible();
    await expect(page.getByText('No redemptions yet')).toBeVisible();
  });

  test('Promotions Audit Log: shows real lifecycle actions with a resolved staff name, and a Promotion-targeted row navigates to its Detail', async ({ page }) => {
    await mockPromotionsSession(page);
    await mockStaffDirectory(page);
    await mockPromotionsResource(page, [basePromotion({ id: 'promo0001', name: 'Summer Sale' })]);
    await mockPromotionsAuditLogs(page, [
      { id: 'a1', actorId: 'staff1', action: 'promotion.created', targetType: 'App\\Domains\\Commerce\\Promotions\\Models\\Promotion', targetId: 'promo0001', createdAt: '2026-08-16T09:00:00Z' },
      { id: 'a2', actorId: 'staff1', action: 'coupon.created', targetType: 'App\\Domains\\Commerce\\Promotions\\Models\\Coupon', targetId: 'coupon0001', createdAt: '2026-08-16T09:01:00Z' },
    ]);
    await page.goto('/marketing/activity');

    await expect(page.getByRole('heading', { name: 'Promotions Audit Log' })).toBeVisible();
    await expect(page.getByText('Promotion created', { exact: true })).toBeVisible();
    await expect(page.getByText('Coupon created', { exact: true })).toBeVisible();
    await expect(page.getByText('Alex Operator').first()).toBeVisible();

    // Only the Promotion-targeted row gets a View link — a Coupon row can't
    // be traced back to its parent Promotion from a flat audit row.
    await expect(page.getByRole('button', { name: 'View promotion' })).toHaveCount(1);
    await page.getByRole('button', { name: 'View promotion' }).click();
    await expect(page).toHaveURL(/\/marketing\/promotions\/promo0001$/);
  });

  test('Permission gating: without promotions.promotions.manage, New promotion and Edit/Archive/Delete are hidden, not merely disabled', async ({ page }) => {
    await mockPromotionsViewerOnlySession(page);
    await mockPromotionsResource(page, [basePromotion({ id: 'promo0001', name: 'Summer Sale' })]);
    await page.goto('/marketing/promotions');

    await expect(page.getByRole('heading', { name: 'Promotions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New promotion' })).toHaveCount(0);

    await page.goto('/marketing/promotions/promo0001');
    await expect(page.getByRole('heading', { name: 'Summer Sale' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Archive' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add condition' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'New coupon' })).toHaveCount(0);
  });

  test('has no critical or serious automated accessibility violations across Promotions List, Promotion Detail, Redemptions, and Promotions Activity', async ({ page }) => {
    await mockPromotionsSession(page);
    await mockStaffDirectory(page);
    await mockPromotionsResource(page, [
      basePromotion({
        id: 'promo0001',
        name: 'Summer Sale',
        conditions: [{ id: 'cond1', promotionId: 'promo0001', conditionType: 'minimum_order_amount', referenceId: null, numericValue: '50.0000' }],
        coupons: [{ id: 'coupon1', promotionId: 'promo0001', code: 'SUMMER10', usageLimitGlobal: null, usageCountGlobal: 0, status: 'active', version: 1 }],
      }),
    ]);
    await mockPromotionsAuditLogs(page, []);
    await mockRedemptions(page, []);

    const pages: [string, string][] = [
      ['/marketing/promotions', 'Summer Sale'],
      ['/marketing/promotions/promo0001', 'Eligibility conditions'],
      ['/marketing/redemptions', 'No redemptions yet'],
      ['/marketing/activity', 'No activity yet'],
    ];
    for (const [path, expectedText] of pages) {
      await page.goto(path);
      await expect(page.getByText(expectedText).first()).toBeVisible();
      const scan = await new AxeBuilder({ page }).include('main').exclude('thead').analyze();
      const critical = scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    }
  });
});

test.describe('Marketing (Phase 3.0 Slice 2 — Redemption Timeline, cross-links, Tester)', () => {
  test('Promotion Detail: Redemption Timeline shows only this promotion\'s real redemptions, with a real customer link', async ({ page }) => {
    await mockPromotionsSession(page);
    await mockPromotionsResource(page, [basePromotion({ id: 'promo0001', name: 'Summer Sale' }), basePromotion({ id: 'promo0002', name: 'Other Sale' })]);
    await mockRedemptions(page, [
      { id: 'r1', promotionId: 'promo0001', couponId: 'coupon1', customerId: 'cust1', orderReference: 'ORD-1', discountAmount: '5.0000', currencyCode: 'USD', redeemedAt: '2026-08-16T09:00:00Z' },
      { id: 'r2', promotionId: 'promo0002', couponId: null, customerId: 'cust2', orderReference: 'ORD-2', discountAmount: '9.0000', currencyCode: 'USD', redeemedAt: '2026-08-16T09:05:00Z' },
    ]);
    await page.goto('/marketing/promotions/promo0001');

    await expect(page.getByRole('heading', { name: 'Redemption timeline' })).toBeVisible();
    await expect(page.getByText('5 USD', { exact: true })).toBeVisible();
    await expect(page.getByText('9 USD', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'View customer' }).click();
    await expect(page).toHaveURL(/\/customers\/cust1$/);
  });

  test('Promotion Detail: an unredeemed promotion shows an honest empty Redemption Timeline', async ({ page }) => {
    await mockPromotionsSession(page);
    await mockPromotionsResource(page, [basePromotion({ id: 'promo0001', name: 'Summer Sale' })]);
    await mockRedemptions(page, []);
    await page.goto('/marketing/promotions/promo0001');

    await expect(page.getByText(/hasn.t been redeemed at Checkout yet/)).toBeVisible();
  });

  test('Redemptions List: a customer id links to the real Customer Detail page, and order_reference is labeled as a reference, never a link', async ({ page }) => {
    await mockPromotionsSession(page);
    await mockRedemptions(page, [
      { id: 'r1', promotionId: 'promo0001', couponId: null, customerId: 'cust1', orderReference: 'ORD-REF-1', discountAmount: '5.0000', currencyCode: 'USD', redeemedAt: '2026-08-16T09:00:00Z' },
    ]);
    await page.goto('/marketing/redemptions');

    await expect(page.getByRole('columnheader', { name: 'Order reference' })).toBeVisible();
    const customerButton = page.getByRole('button', { name: 'cust1'.slice(0, 8) });
    await customerButton.click();
    await expect(page).toHaveURL(/\/customers\/cust1$/);
  });

  test('Redemptions List: a real ?promotion_id= deep-link (from the Redemption Timeline\'s own "View all") pre-fills the filter', async ({ page }) => {
    await mockPromotionsSession(page);
    await mockRedemptions(page, [
      { id: 'r1', promotionId: 'promo0001', couponId: null, customerId: null, orderReference: null, discountAmount: '5.0000', currencyCode: 'USD', redeemedAt: '2026-08-16T09:00:00Z' },
      { id: 'r2', promotionId: 'promo0002', couponId: null, customerId: null, orderReference: null, discountAmount: '9.0000', currencyCode: 'USD', redeemedAt: '2026-08-16T09:05:00Z' },
    ]);
    await page.goto('/marketing/redemptions?promotion_id=promo0001');

    await expect(page.getByText('5 USD', { exact: true })).toBeVisible();
    await expect(page.getByText('9 USD', { exact: true })).toHaveCount(0);
  });

  test('Promotion Tester: a real cart against POST /promotions/evaluate shows which promotions would apply, with no order or redemption created', async ({ page }) => {
    await mockPromotionsSession(page);
    await mockEvaluate(page, {
      appliedPromotions: [{ promotionId: 'promo0001', name: 'Summer Sale', discountType: 'percentage', discountAmount: '6.0000', couponId: null }],
      totalDiscount: '6.0000',
      freeShipping: false,
    });
    await page.goto('/marketing/tester');

    await page.getByLabel('Currency').fill('USD');
    await page.getByLabel('Product id').fill('11111111-1111-1111-1111-111111111111');
    await page.getByLabel('Quantity').fill('1');
    await page.getByLabel('Unit price').fill('60');
    await page.getByRole('button', { name: 'Test this cart' }).click();

    await expect(page.getByText('Summer Sale')).toBeVisible();
    await expect(page.getByText('Total discount')).toBeVisible();
    await expect(page.getByText('6', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/no order, redemption, or usage count was created/)).toBeVisible();
  });

  test('Promotion Tester: honestly reports when no real promotion applies', async ({ page }) => {
    await mockPromotionsSession(page);
    await mockEvaluate(page, { appliedPromotions: [], totalDiscount: '0.0000', freeShipping: false });
    await page.goto('/marketing/tester');

    await page.getByLabel('Currency').fill('USD');
    await page.getByLabel('Product id').fill('11111111-1111-1111-1111-111111111111');
    await page.getByLabel('Quantity').fill('1');
    await page.getByLabel('Unit price').fill('5');
    await page.getByRole('button', { name: 'Test this cart' }).click();

    await expect(page.getByText('No real promotion applies to this cart.')).toBeVisible();
  });

  test('Permission gating: without promotions.redemptions.view, the Redemption Timeline card is hidden on Promotion Detail', async ({ page }) => {
    await mockPromotionsViewerOnlySession(page);
    await mockPromotionsResource(page, [basePromotion({ id: 'promo0001', name: 'Summer Sale' })]);
    await page.goto('/marketing/promotions/promo0001');

    await expect(page.getByRole('heading', { name: 'Summer Sale' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Redemption timeline' })).toHaveCount(0);
  });

  test('has no critical or serious automated accessibility violations on the Promotion Tester', async ({ page }) => {
    await mockPromotionsSession(page);
    await page.goto('/marketing/tester');
    await expect(page.getByRole('heading', { name: 'Promotion / Coupon Tester' })).toBeVisible();
    const scan = await new AxeBuilder({ page }).include('main').analyze();
    const critical = scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });
});
