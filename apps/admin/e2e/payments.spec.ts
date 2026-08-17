import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPaymentsSession, mockPaymentsViewerOnlySession } from './mocks.js';

type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'cancelled' | 'voided' | 'partially_refunded' | 'refunded';

interface FakeAttempt {
  id: string;
  type: string;
  status: string;
  gatewayCode: string;
  gatewayReference: string | null;
  amount: string | null;
  currencyCode: string | null;
  failureReason: string | null;
  occurredAt: string;
}

interface FakePayment {
  id: string;
  orderId: string;
  customerId: string | null;
  gatewayCode: string;
  currencyCode: string;
  amount: string;
  amountCaptured: string;
  status: PaymentStatus;
  proofReference: string | null;
  instructions: string | null;
  failureReason: string | null;
  initiatedAt: string;
  authorizedAt: string | null;
  capturedAt: string | null;
  cancelledAt: string | null;
  failedAt: string | null;
  attempts: FakeAttempt[];
}

function basePayment(overrides: Partial<FakePayment> = {}): FakePayment {
  return {
    id: 'pay0001',
    orderId: 'order0001',
    customerId: 'cust0001',
    gatewayCode: 'bkash',
    currencyCode: 'BDT',
    amount: '1250.0000',
    amountCaptured: '0.0000',
    status: 'pending',
    proofReference: null,
    instructions: null,
    failureReason: null,
    initiatedAt: '2026-08-16T09:00:00Z',
    authorizedAt: null,
    capturedAt: null,
    cancelledAt: null,
    failedAt: null,
    attempts: [],
    ...overrides,
  };
}

function toPaymentResource(p: FakePayment) {
  return {
    id: p.id,
    orderId: p.orderId,
    customerId: p.customerId,
    gatewayCode: p.gatewayCode,
    currencyCode: p.currencyCode,
    amount: p.amount,
    amountCaptured: p.amountCaptured,
    status: p.status,
    proofReference: p.proofReference,
    redirectUrl: null,
    instructions: p.instructions,
    failureReason: p.failureReason,
    initiatedAt: p.initiatedAt,
    authorizedAt: p.authorizedAt,
    capturedAt: p.capturedAt,
    cancelledAt: p.cancelledAt,
    failedAt: p.failedAt,
    attempts: p.attempts,
    version: 1,
    createdAt: p.initiatedAt,
    updatedAt: p.initiatedAt,
  };
}

async function mockPaymentsResource(page: Page, payments: FakePayment[]): Promise<void> {
  await page.route('**/api/v1/payments*', async (route) => {
    const request = route.request();
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }
    const url = new URL(request.url());
    const status = url.searchParams.get('status');
    const filtered = status ? payments.filter((p) => p.status === status) : payments;
    await route.fulfill({ json: { data: filtered.map(toPaymentResource), meta: { current_page: 1, per_page: 25, total: filtered.length, last_page: 1 } } });
  });

  await page.route('**/api/v1/payments/*', async (route) => {
    const request = route.request();
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }
    const id = new URL(request.url()).pathname.split('/').filter(Boolean).at(-1);
    const payment = payments.find((p) => p.id === id);
    if (!payment) {
      await route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
      return;
    }
    await route.fulfill({ json: { data: toPaymentResource(payment) } });
  });

  await page.route('**/api/v1/payments/methods*', async (route) => {
    await route.fulfill({
      json: { data: [{ code: 'bkash', label: 'bKash' }, { code: 'cod', label: 'Cash On Delivery' }, { code: 'bank_transfer', label: 'Bank Transfer' }] },
    });
  });
}

interface FakeAuditLog {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

async function mockPaymentAuditLogs(page: Page, logs: FakeAuditLog[]): Promise<void> {
  await page.route('**/api/v1/payments/audit-logs*', async (route) => {
    const url = new URL(route.request().url());
    const actorId = url.searchParams.get('actor_id');
    const filtered = actorId ? logs.filter((l) => l.actorId === actorId) : logs;
    await route.fulfill({
      json: { data: filtered.map((l) => ({ ...l, before: null, after: null, correlationId: null })), meta: { current_page: 1, per_page: 25, total: filtered.length, last_page: 1 } },
    });
  });
}

/**
 * Merchant Payment Operations — Phase 2.9 Slice 2. One handler per real
 * `PaymentActionController`/`BankTransferVerificationController` endpoint.
 * `respond` lets a test simulate the real 409 (`ConcurrencyConflictException`)
 * a stale `expected_version` produces, matching the shape `paymentsErrorMessage`
 * itself branches on (`ConflictError`).
 */
async function mockPaymentWorkflow(
  page: Page,
  payments: FakePayment[],
  options: { respond?: 'success' | 'conflict' } = {},
): Promise<void> {
  const respond = options.respond ?? 'success';
  const routes: Array<[string, (p: FakePayment, body: Record<string, unknown>) => Partial<FakePayment>]> = [
    ['capture', () => ({ status: 'captured', capturedAt: '2026-08-17T00:00:00Z' })],
    ['cancel', (_p, body) => ({ status: 'cancelled', cancelledAt: '2026-08-17T00:00:00Z', failureReason: body.reason as string })],
    ['void', (_p, body) => ({ status: 'voided', failureReason: body.reason as string })],
    ['bank-transfer/proof', (_p, body) => ({ proofReference: body.proof_reference as string })],
    ['bank-transfer/approve', () => ({ status: 'captured', capturedAt: '2026-08-17T00:00:00Z' })],
    ['bank-transfer/reject', (_p, body) => ({ status: 'failed', failedAt: '2026-08-17T00:00:00Z', failureReason: body.reason as string })],
  ];

  for (const [suffix, apply] of routes) {
    await page.route(`**/api/v1/payments/*/${suffix}`, async (route) => {
      if (respond === 'conflict') {
        await route.fulfill({
          status: 409,
          json: { error: { type: 'conflict', message: 'Payment [pay0001] has changed since it was last read: expected version 1, found 2.' } },
        });
        return;
      }
      // `suffix` itself may be one segment (`capture`) or two (`bank-transfer/proof`) —
      // the id always sits immediately before it, regardless of which.
      const suffixSegments = suffix.split('/').length;
      const id = new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1 - suffixSegments);
      const payment = payments.find((p) => p.id === id);
      if (!payment) {
        await route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
        return;
      }
      const body = route.request().postDataJSON() as Record<string, unknown>;
      Object.assign(payment, apply(payment, body));
      await route.fulfill({ json: { data: toPaymentResource(payment) } });
    });
  }
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

test.describe('Payments (Phase 2.9 Slice 1 — Merchant Payment Management)', () => {
  test('Payments List: lists real payments with gateway, amount, and status, and filters by Status', async ({ page }) => {
    await mockPaymentsSession(page);
    await mockPaymentsResource(page, [
      basePayment({ id: 'pay0001', status: 'captured', gatewayCode: 'bkash', amount: '1250.0000', amountCaptured: '1250.0000' }),
      basePayment({ id: 'pay0002', status: 'pending', gatewayCode: 'cod', amount: '500.0000' }),
    ]);
    await page.goto('/payments/payments');

    await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
    // `uppercase` is a CSS-only display transform — the underlying DOM text
    // content stays lowercase, which is what `getByText` actually matches.
    await expect(page.getByText('bkash', { exact: true })).toBeVisible();
    await expect(page.getByText('cod', { exact: true })).toBeVisible();
    await expect(page.getByText('captured', { exact: true })).toBeVisible();
    await expect(page.getByText('pending', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByLabel('Status').click();
    await page.getByRole('option', { name: 'Captured' }).click();

    await expect(page.getByText('captured', { exact: true })).toBeVisible();
    await expect(page.getByText('pending', { exact: true })).toHaveCount(0);
  });

  test('Payment Detail: shows Overview, real Transaction Timeline from attempts, and the Audit link navigates to Payments Activity', async ({ page }) => {
    await mockPaymentsSession(page);
    await mockPaymentsResource(page, [
      basePayment({
        id: 'pay0001',
        status: 'captured',
        gatewayCode: 'bkash',
        amount: '1250.0000',
        amountCaptured: '1250.0000',
        capturedAt: '2026-08-16T09:05:00Z',
        attempts: [
          { id: 'att1', type: 'initiation', status: 'succeeded', gatewayCode: 'bkash', gatewayReference: null, amount: '1250.0000', currencyCode: 'BDT', failureReason: null, occurredAt: '2026-08-16T09:00:00Z' },
          { id: 'att2', type: 'capture', status: 'succeeded', gatewayCode: 'bkash', gatewayReference: 'TRX99887766', amount: '1250.0000', currencyCode: 'BDT', failureReason: null, occurredAt: '2026-08-16T09:05:00Z' },
        ],
      }),
    ]);
    await mockPaymentAuditLogs(page, []);
    await page.goto('/payments/payments/pay0001');

    await expect(page.getByText('bKash', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Transaction Timeline' })).toBeVisible();
    // "Initiated" also appears as the Overview card's own field label
    // (a caption, styled distinctly from the Timeline's body-strong entry
    // label) — scope past that ambiguity by asserting on the styled entry.
    await expect(page.locator('.text-body-strong', { hasText: 'Initiated' })).toBeVisible();
    await expect(page.locator('.text-body-strong', { hasText: 'Captured' }).first()).toBeVisible();
    await expect(page.getByText('TRX99887766')).toBeVisible();

    await page.getByRole('link', { name: 'Audit' }).click();
    await expect(page).toHaveURL(/\/payments\/activity$/);
    await expect(page.getByRole('heading', { name: 'Payments Audit Log' })).toBeVisible();
  });

  test('Payment Detail: a payment with no attempts shows an honest empty Transaction Timeline, never a fabricated entry', async ({ page }) => {
    await mockPaymentsSession(page);
    await mockPaymentsResource(page, [basePayment({ id: 'pay0002', status: 'pending', attempts: [] })]);
    await page.goto('/payments/payments/pay0002');

    await expect(page.getByText('No transaction attempts recorded yet.')).toBeVisible();
  });

  test('Payments Audit Log: shows real payment lifecycle actions with a resolved staff name, and rows navigate to Payment Detail', async ({ page }) => {
    await mockPaymentsSession(page);
    await mockStaffDirectory(page);
    await mockPaymentsResource(page, [basePayment({ id: 'pay0001', status: 'captured' })]);
    await mockPaymentAuditLogs(page, [
      { id: 'a1', actorId: 'staff1', action: 'payment.captured', targetType: 'App\\Domains\\Commerce\\Payments\\Models\\Payment', targetId: 'pay0001', createdAt: '2026-08-16T09:05:00Z' },
    ]);
    await page.goto('/payments/activity');

    await expect(page.getByRole('heading', { name: 'Payments Audit Log' })).toBeVisible();
    await expect(page.getByText('Payment captured', { exact: true })).toBeVisible();
    await expect(page.getByText('Alex Operator', { exact: true })).toBeVisible();

    await page.getByRole('row', { name: /Payment captured/ }).click();
    await expect(page).toHaveURL(/\/payments\/payments\/pay0001$/);
  });

  test('Payment Actions: Capture moves a pending payment to captured and appends a Transaction Timeline entry', async ({ page }) => {
    await mockPaymentsSession(page);
    const payment = basePayment({ id: 'pay0001', status: 'pending', gatewayCode: 'cod', amount: '500.0000' });
    await mockPaymentsResource(page, [payment]);
    await mockPaymentWorkflow(page, [payment]);
    await page.goto('/payments/payments/pay0001');

    await page.getByRole('button', { name: 'Capture' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Capture' }).click();

    await expect(page.getByText('captured', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('This payment is in a final state')).toBeVisible();
  });

  test('Payment Actions: Cancel requires a reason and moves the payment to cancelled once given', async ({ page }) => {
    await mockPaymentsSession(page);
    const payment = basePayment({ id: 'pay0001', status: 'pending' });
    await mockPaymentsResource(page, [payment]);
    await mockPaymentWorkflow(page, [payment]);
    await page.goto('/payments/payments/pay0001');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Cancel payment' }).click();
    await expect(page.getByText('A reason is required to cancel a payment.')).toBeVisible();

    await page.getByLabel('Reason').fill('Customer changed their mind.');
    await page.getByRole('button', { name: 'Cancel payment' }).click();

    await expect(page.getByText('cancelled', { exact: true }).first()).toBeVisible();
  });

  test('Payment Actions: Void is offered only for an authorized payment, not a merely pending one', async ({ page }) => {
    await mockPaymentsSession(page);
    const pending = basePayment({ id: 'pay0001', status: 'pending' });
    const authorized = basePayment({ id: 'pay0002', status: 'authorized', authorizedAt: '2026-08-16T09:01:00Z' });
    await mockPaymentsResource(page, [pending, authorized]);
    await mockPaymentWorkflow(page, [pending, authorized]);

    await page.goto('/payments/payments/pay0001');
    await expect(page.getByRole('button', { name: 'Void' })).toHaveCount(0);

    await page.goto('/payments/payments/pay0002');
    await page.getByRole('button', { name: 'Void' }).click();
    await page.getByLabel('Reason').fill('Authorization expired at the gateway.');
    await page.getByRole('button', { name: 'Void payment' }).click();

    await expect(page.getByText('voided', { exact: true }).first()).toBeVisible();
  });

  test('Payment Actions: a stale expected_version surfaces the real 409 as a reload prompt, not a silent failure', async ({ page }) => {
    await mockPaymentsSession(page);
    const payment = basePayment({ id: 'pay0001', status: 'pending' });
    await mockPaymentsResource(page, [payment]);
    await mockPaymentWorkflow(page, [payment], { respond: 'conflict' });
    await page.goto('/payments/payments/pay0001');

    await page.getByRole('button', { name: 'Capture' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Capture' }).click();

    await expect(page.getByText(/changed elsewhere since it loaded/)).toBeVisible();
  });

  test('Payment Actions: without payments.payments.manage, Capture/Cancel/Void are hidden, not merely disabled', async ({ page }) => {
    await mockPaymentsViewerOnlySession(page);
    const payment = basePayment({ id: 'pay0001', status: 'pending' });
    await mockPaymentsResource(page, [payment]);
    await page.goto('/payments/payments/pay0001');

    await expect(page.getByRole('heading', { name: /^Payment /, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Capture' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  });

  test('Bank Transfer verification: only offered for a bank_transfer payment, with Attach proof/Approve/Reject all wired to the real endpoints', async ({ page }) => {
    await mockPaymentsSession(page);
    const cod = basePayment({ id: 'pay0001', status: 'pending', gatewayCode: 'cod' });
    const bankTransfer = basePayment({ id: 'pay0002', status: 'pending', gatewayCode: 'bank_transfer', instructions: 'Transfer 500.0000 to Test Bank.' });
    await mockPaymentsResource(page, [cod, bankTransfer]);
    await mockPaymentWorkflow(page, [cod, bankTransfer]);

    await page.goto('/payments/payments/pay0001');
    await expect(page.getByText('Bank transfer verification')).toHaveCount(0);

    await page.goto('/payments/payments/pay0002');
    await expect(page.getByText('Bank transfer verification')).toBeVisible();

    await page.getByRole('button', { name: 'Attach proof' }).click();
    await page.getByLabel('Proof reference').fill('TXN-E2E-001');
    await page.getByRole('dialog').getByRole('button', { name: 'Attach proof' }).click();
    await expect(page.getByText('TXN-E2E-001')).toBeVisible();

    await page.getByRole('button', { name: 'Approve transfer' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('captured', { exact: true }).first()).toBeVisible();
  });

  test('Bank Transfer verification: Reject requires a reason and marks the payment failed with it', async ({ page }) => {
    await mockPaymentsSession(page);
    const payment = basePayment({ id: 'pay0001', status: 'pending', gatewayCode: 'bank_transfer' });
    await mockPaymentsResource(page, [payment]);
    await mockPaymentWorkflow(page, [payment]);
    await page.goto('/payments/payments/pay0001');

    await page.getByRole('button', { name: 'Reject transfer' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reject transfer' }).click();
    await expect(page.getByText('A reason is required to reject a bank transfer.')).toBeVisible();

    await page.getByLabel('Reason').fill('No matching transfer found.');
    await page.getByRole('dialog').getByRole('button', { name: 'Reject transfer' }).click();

    await expect(page.getByText('failed', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('No matching transfer found.').first()).toBeVisible();
  });

  test('has no critical or serious automated accessibility violations across Payments List, Payment Detail, and Payments Activity', async ({ page }) => {
    await mockPaymentsSession(page);
    await mockStaffDirectory(page);
    await mockPaymentsResource(page, [
      basePayment({
        id: 'pay0001',
        status: 'captured',
        capturedAt: '2026-08-16T09:05:00Z',
        attempts: [{ id: 'att1', type: 'capture', status: 'succeeded', gatewayCode: 'bkash', gatewayReference: 'TRX1', amount: '1250.0000', currencyCode: 'BDT', failureReason: null, occurredAt: '2026-08-16T09:05:00Z' }],
      }),
    ]);
    await mockPaymentAuditLogs(page, []);

    const pages: [string, string][] = [
      ['/payments/payments', 'BKASH'],
      ['/payments/payments/pay0001', 'Transaction Timeline'],
      ['/payments/activity', 'No activity yet'],
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
