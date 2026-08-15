import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockCustomersSession } from './mocks.js';

interface FakeAddress {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

interface FakeCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  version: number;
  createdAt: string;
  addresses: FakeAddress[];
}

function toCustomerResource(c: FakeCustomer, withAddresses: boolean) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    status: c.status,
    version: c.version,
    createdAt: c.createdAt,
    updatedAt: c.createdAt,
    ...(withAddresses ? { addresses: c.addresses.map(toAddressResource) } : {}),
  };
}

function toAddressResource(a: FakeAddress) {
  return {
    id: a.id,
    label: a.label,
    recipientName: a.recipientName,
    phone: a.phone,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2,
    city: a.city,
    region: a.region,
    postalCode: a.postalCode,
    countryCode: a.countryCode,
    isDefaultShipping: a.isDefaultShipping,
    isDefaultBilling: a.isDefaultBilling,
    createdAt: null,
    updatedAt: null,
  };
}

/**
 * A bespoke Customers mock — mirrors `pricing-tax.spec.ts`'s own
 * `mockTaxResources` shape, but with genuine server-side `q`/`status`/
 * `sort`/`direction`/`page`/`per_page` handling (`CustomerController::
 * index`'s real contract, confirmed by reading it directly), not a
 * client-filtered fixture — this is the one thing this spec must prove
 * that Pricing's own specs never needed to: the List page really does send
 * search/sort/pagination to the server and really does render whatever
 * page the server returns, rather than fetching everything and filtering
 * in the browser.
 */
/**
 * Customer Detail now also renders Slice 2's own Recent Orders/Recent
 * Activity cards (real permissions on the fake session — see `mocks.ts`'s
 * own `CUSTOMERS_PERMISSIONS`) — every test in this file that visits a
 * Customer Detail page needs these three real endpoints mocked too, even
 * though this file's own tests are scoped to Slice 1's own CRUD, or those
 * cards' unmocked requests fall through to a real network call and disrupt
 * the very state these tests assert on. Benign, empty responses — none of
 * this file's own tests exercise Slice 2's own behavior; that's
 * `customers-activity.spec.ts`'s job.
 */
async function mockSlice2Extras(page: Page): Promise<void> {
  await page.route('**/api/v1/orders*', async (route) => {
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 15, total: 0, last_page: 1 } } });
  });
  await page.route('**/api/v1/customers/audit-logs*', async (route) => {
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 } } });
  });
  await page.route('**/api/v1/users*', async (route) => {
    await route.fulfill({ json: { data: [], meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 } } });
  });
}

async function mockCustomersResource(page: Page, initial: FakeCustomer[] = []): Promise<void> {
  const customers = [...initial];
  let nextId = customers.length + 1;

  await page.route('**/api/v1/customers*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET') {
      let result = [...customers];
      const q = url.searchParams.get('q');
      if (q) {
        const term = q.toLowerCase();
        result = result.filter((c) => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term) || (c.phone ?? '').includes(term));
      }
      const status = url.searchParams.get('status');
      if (status) result = result.filter((c) => c.status === status);
      const sort = url.searchParams.get('sort');
      const direction = url.searchParams.get('direction') === 'asc' ? 1 : -1;
      if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name) * direction);
      if (sort === 'email') result.sort((a, b) => a.email.localeCompare(b.email) * direction);
      if (sort === 'created_at') result.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1) * direction);

      const perPage = Number(url.searchParams.get('per_page') ?? 25);
      const page_ = Number(url.searchParams.get('page') ?? 1);
      const total = result.length;
      const lastPage = Math.max(1, Math.ceil(total / perPage));
      const pageItems = result.slice((page_ - 1) * perPage, page_ * perPage);

      await route.fulfill({
        json: {
          data: pageItems.map((c) => toCustomerResource(c, false)),
          meta: { current_page: page_, per_page: perPage, total, last_page: lastPage },
        },
      });
      return;
    }

    if (request.method() === 'POST') {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      const email = String(body.email);
      if (customers.some((c) => c.email === email)) {
        await route.fulfill({
          status: 422,
          json: { error: { type: 'validation_failed', message: 'The given data was invalid.', details: { email: ['The email has already been taken.'] } } },
        });
        return;
      }
      const password = typeof body.password === 'string' ? body.password : '';
      if (password.length < 12) {
        await route.fulfill({
          status: 422,
          json: { error: { type: 'validation_failed', message: 'The given data was invalid.', details: { password: ['The password must be at least 12 characters.'] } } },
        });
        return;
      }
      const customer: FakeCustomer = {
        id: String(nextId++),
        name: String(body.name),
        email,
        phone: (body.phone as string) ?? null,
        status: 'active',
        version: 1,
        createdAt: new Date().toISOString(),
        addresses: [],
      };
      customers.push(customer);
      await route.fulfill({ status: 201, json: { data: toCustomerResource(customer, false) } });
      return;
    }

    await route.continue();
  });

  await page.route('**/api/v1/customers/**', async (route) => {
    const request = route.request();
    const segments = new URL(request.url()).pathname.split('/').filter(Boolean);
    // .../customers/{id}[/archive|/addresses[/{addressId}]]
    const customersIndex = segments.indexOf('customers');
    const id = segments[customersIndex + 1];
    const sub = segments[customersIndex + 2];
    const customer = customers.find((c) => c.id === id);
    if (!customer) {
      await route.fulfill({ status: 404, json: { error: { type: 'not_found', message: 'Not found.' } } });
      return;
    }

    if (!sub) {
      if (request.method() === 'GET') {
        await route.fulfill({ json: { data: toCustomerResource(customer, true) } });
        return;
      }
      if (request.method() === 'PATCH') {
        const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
        const expectedVersion = Number(body.expected_version);
        if (expectedVersion !== customer.version) {
          await route.fulfill({
            status: 409,
            json: { error: { type: 'conflict', message: `App\\Domains\\Commerce\\Customers\\Models\\Customer [${customer.id}]: expected version [${expectedVersion}] does not match current version [${customer.version}]` } },
          });
          return;
        }
        Object.assign(customer, {
          name: (body.name as string) ?? customer.name,
          email: (body.email as string) ?? customer.email,
          phone: body.phone !== undefined ? (body.phone as string | null) : customer.phone,
          version: customer.version + 1,
        });
        await route.fulfill({ json: { data: toCustomerResource(customer, false) } });
        return;
      }
      if (request.method() === 'DELETE') {
        customers.splice(customers.indexOf(customer), 1);
        await route.fulfill({ status: 204, body: '' });
        return;
      }
    }

    if (sub === 'archive' && request.method() === 'POST') {
      customer.status = 'archived';
      customer.version += 1;
      await route.fulfill({ json: { data: toCustomerResource(customer, false) } });
      return;
    }

    if (sub === 'addresses') {
      const addressId = segments[customersIndex + 3];
      if (!addressId && request.method() === 'POST') {
        const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
        if (body.is_default_shipping === true) customer.addresses.forEach((a) => (a.isDefaultShipping = false));
        if (body.is_default_billing === true) customer.addresses.forEach((a) => (a.isDefaultBilling = false));
        const address: FakeAddress = {
          id: `a${customer.addresses.length + 1}`,
          label: (body.label as string) ?? null,
          recipientName: String(body.recipient_name),
          phone: (body.phone as string) ?? null,
          addressLine1: String(body.address_line1),
          addressLine2: (body.address_line2 as string) ?? null,
          city: String(body.city),
          region: (body.region as string) ?? null,
          postalCode: (body.postal_code as string) ?? null,
          countryCode: String(body.country_code).toUpperCase(),
          isDefaultShipping: body.is_default_shipping === true,
          isDefaultBilling: body.is_default_billing === true,
        };
        customer.addresses.push(address);
        customer.version += 1;
        await route.fulfill({ status: 201, json: { data: toAddressResource(address) } });
        return;
      }
      const address = customer.addresses.find((a) => a.id === addressId);
      if (address && request.method() === 'PATCH') {
        const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
        if (body.is_default_billing === true) customer.addresses.forEach((a) => (a.isDefaultBilling = false));
        Object.assign(address, {
          city: (body.city as string) ?? address.city,
          isDefaultBilling: body.is_default_billing !== undefined ? body.is_default_billing === true : address.isDefaultBilling,
        });
        customer.version += 1;
        await route.fulfill({ json: { data: toAddressResource(address) } });
        return;
      }
      if (address && request.method() === 'DELETE') {
        customer.addresses.splice(customer.addresses.indexOf(address), 1);
        customer.version += 1;
        await route.fulfill({ status: 204, body: '' });
        return;
      }
    }

    await route.continue();
  });

  // Registered last so it's matched first (Playwright runs routes in
  // reverse registration order) — both `**/api/v1/customers*` handlers
  // above would otherwise also match `/customers/audit-logs`, since that
  // URL genuinely starts with `/customers` too.
  await mockSlice2Extras(page);
}

test.describe('Customers (Slice 1)', () => {
  test('List: shows an empty state, then real server-side search/status-filter/sort/pagination', async ({ page }) => {
    await mockCustomersSession(page);
    const fixtures: FakeCustomer[] = [
      { id: '1', name: 'Alice Anderson', email: 'alice@example.test', phone: null, status: 'active', version: 1, createdAt: '2026-08-01T00:00:00Z', addresses: [] },
      { id: '2', name: 'Bob Baker', email: 'bob@example.test', phone: null, status: 'archived', version: 1, createdAt: '2026-08-02T00:00:00Z', addresses: [] },
      { id: '3', name: 'Carol Chen', email: 'carol@example.test', phone: null, status: 'active', version: 1, createdAt: '2026-08-03T00:00:00Z', addresses: [] },
    ];
    await mockCustomersResource(page, fixtures);
    await page.goto('/customers');

    await expect(page.getByText('Alice Anderson')).toBeVisible();
    await expect(page.getByText('Bob Baker')).toBeVisible();
    await expect(page.getByText('Carol Chen')).toBeVisible();

    // Real server-side search — a request round-trip, not a client filter.
    await page.getByPlaceholder('Search name, email, or phone…').fill('alice');
    await expect(page.getByText('Bob Baker')).toHaveCount(0);
    await expect(page.getByText('Alice Anderson')).toBeVisible();
    await page.getByPlaceholder('Search name, email, or phone…').fill('');

    // Real server-side status filter, behind the FilterBar's own "Filters" popover.
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByLabel('Status').click();
    await page.getByRole('option', { name: 'Archived', exact: true }).click();
    await expect(page.getByText('Bob Baker')).toBeVisible();
    await expect(page.getByText('Alice Anderson')).toHaveCount(0);
  });

  test('List: search is debounced — typing a name fires far fewer real requests than keystrokes, found and fixed during this module\'s own Freeze Audit', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomersResource(page, [
      { id: '1', name: 'Alice Anderson', email: 'alice@example.test', phone: null, status: 'active', version: 1, createdAt: '2026-08-01T00:00:00Z', addresses: [] },
    ]);
    await page.goto('/customers');
    await expect(page.getByText('Alice Anderson')).toBeVisible();

    let searchRequestCount = 0;
    page.on('request', (req) => {
      if (decodeURIComponent(req.url()).includes('/api/v1/customers?q=')) searchRequestCount++;
    });

    // 5 keystrokes, typed with a real per-character delay well under the debounce window.
    await page.getByPlaceholder('Search name, email, or phone…').pressSequentially('alice', { delay: 50 });
    // Wait past the debounce window for the one real request to land.
    await page.waitForTimeout(600);

    expect(searchRequestCount).toBeLessThan(5);
    expect(searchRequestCount).toBeGreaterThan(0);
  });

  test('Create: registers a customer with a generated password, rejects a duplicate email on the Email field', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomersResource(page, [
      { id: '1', name: 'Existing Customer', email: 'existing@example.test', phone: null, status: 'active', version: 1, createdAt: '2026-08-01T00:00:00Z', addresses: [] },
    ]);
    await page.goto('/customers');

    await page.getByRole('button', { name: 'New customer' }).first().click();
    await page.getByLabel('Name').fill('Jane Shopper');
    await page.getByLabel('Email').fill('jane@example.test');
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.getByRole('button', { name: 'Create customer' }).click();

    await expect(page.getByText('Customer created', { exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Jane Shopper', exact: true })).toBeVisible();

    // Duplicate email — the real server field key is `email`; this is the
    // live, end-to-end proof `applyServerValidationErrors` attaches it to
    // the visible Email input.
    await page.getByRole('button', { name: 'New customer' }).first().click();
    await page.getByLabel('Name').fill('Another Person');
    await page.getByLabel('Email').fill('existing@example.test');
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.getByRole('button', { name: 'Create customer' }).click();
    await expect(page.getByText('The email has already been taken.')).toBeVisible();
  });

  test('Create: client-side rejects a password shorter than 12 characters before ever hitting the server', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomersResource(page, []);
    await page.goto('/customers');

    await page.getByRole('button', { name: 'New customer' }).first().click();
    await page.getByLabel('Name').fill('Jane Shopper');
    await page.getByLabel('Email').fill('jane@example.test');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm password').fill('short');
    await page.getByRole('button', { name: 'Create customer' }).click();

    await expect(page.getByText('Must be at least 12 characters')).toBeVisible();
  });

  test('Edit: updates a customer, and a genuine concurrent edit surfaces as a real optimistic-lock 409', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomersResource(page, [
      { id: '1', name: 'Jane Shopper', email: 'jane@example.test', phone: null, status: 'active', version: 1, createdAt: '2026-08-01T00:00:00Z', addresses: [] },
    ]);
    await page.goto('/customers');

    // A normal edit succeeds first.
    await page.getByRole('button', { name: 'Actions for Jane Shopper' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel('Phone').fill('+1-202-555-0150');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Customer updated', { exact: true })).toBeVisible();

    // Now open Edit again (the dialog captures the row's own version, 2,
    // at this point) and simulate a second operator changing the same
    // customer behind this dialog's back before it's saved — a real
    // concurrent edit, not a simulated one.
    await page.getByRole('button', { name: 'Actions for Jane Shopper' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.evaluate(async () => {
      await fetch('http://localhost:8080/api/v1/customers/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Changed Elsewhere', expected_version: 2 }),
      });
    });
    await page.getByLabel('Name').fill('Jane Renamed');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('This was changed elsewhere since it loaded')).toBeVisible();
  });

  test('Detail: dedicated route shows Overview fields, a copyable Customer ID, and an Addresses section', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomersResource(page, [
      {
        id: '1',
        name: 'Jane Shopper',
        email: 'jane@example.test',
        phone: '+1-202-555-0150',
        status: 'active',
        version: 1,
        createdAt: '2026-08-01T00:00:00Z',
        addresses: [],
      },
    ]);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/customers');
    await page.getByRole('cell', { name: 'Jane Shopper', exact: true }).click();

    await expect(page).toHaveURL(/\/customers\/1$/);
    await expect(page.getByRole('heading', { name: 'Jane Shopper' })).toBeVisible();
    await expect(page.getByText('jane@example.test').first()).toBeVisible();
    await expect(page.getByText('+1-202-555-0150')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible();
    await expect(page.getByText('No addresses on file yet.')).toBeVisible();
    // Real Slice 2 sections — Recent Orders/Recent Activity are now real,
    // not the Slice 1 placeholder; their own real behavior is
    // `customers-activity.spec.ts`'s job, not this Slice 1 spec's.
    await expect(page.getByRole('heading', { name: 'Recent Orders' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();

    await page.getByRole('button', { name: 'Copy customer ID' }).click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe('1');
  });

  test('Address book: adds an address, promotes it to default shipping demoting the previous default, then edits and deletes it', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomersResource(page, [
      {
        id: '1',
        name: 'Jane Shopper',
        email: 'jane@example.test',
        phone: null,
        status: 'active',
        version: 1,
        createdAt: '2026-08-01T00:00:00Z',
        addresses: [
          {
            id: 'a0',
            label: 'Old Home',
            recipientName: 'Old Default',
            phone: null,
            addressLine1: '1 Old St',
            addressLine2: null,
            city: 'Springfield',
            region: null,
            postalCode: null,
            countryCode: 'US',
            isDefaultShipping: true,
            isDefaultBilling: false,
          },
        ],
      },
    ]);
    await page.goto('/customers/1');

    await expect(page.getByText('Default shipping')).toBeVisible();

    await page.getByRole('button', { name: 'Add address' }).click();
    const addDialog = page.getByRole('dialog', { name: 'Add address' });
    await addDialog.getByLabel('Recipient name').fill('Jane Shopper');
    await addDialog.getByLabel('Address line 1').fill('1 Market Street');
    await addDialog.getByLabel('City').fill('San Francisco');
    await addDialog.getByLabel('Country').fill('US');
    await addDialog.getByLabel('Default shipping address').check();
    await addDialog.getByRole('button', { name: 'Add address' }).click();

    await expect(page.getByText('Address added', { exact: true })).toBeVisible();
    await expect(page.getByText('Old Default')).toBeVisible();
    // The new address is now the default shipping address — exactly one
    // "Default shipping" badge exists, and it's no longer on the old one
    // (the server's own promote-and-demote invariant, reflected here).
    await expect(page.getByText('Default shipping')).toHaveCount(1);

    // Edit — the newly-added address (no label, so its own accessible name
    // falls back to its recipient) — promote to default billing too.
    await page.getByRole('button', { name: /Actions for address \(Jane Shopper\)/ }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel('City').fill('Oakland');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Address updated', { exact: true })).toBeVisible();
    await expect(page.getByText('Oakland', { exact: false })).toBeVisible();

    // Delete it.
    await page.getByRole('button', { name: /Actions for address \(Jane Shopper\)/ }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog', { name: 'Delete this address?' }).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Oakland', { exact: false })).toHaveCount(0);
  });

  test('Delete: removes a customer and returns to the list, with an honest description of what is and is not affected', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomersResource(page, [
      { id: '1', name: 'Jane Shopper', email: 'jane@example.test', phone: null, status: 'active', version: 1, createdAt: '2026-08-01T00:00:00Z', addresses: [] },
    ]);
    await page.goto('/customers/1');

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(/Their past orders are unaffected/)).toBeVisible();
    await page.getByRole('dialog', { name: 'Delete this customer?' }).getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page).toHaveURL(/\/customers$/);
    await expect(page.getByText('Jane Shopper')).toHaveCount(0);
  });

  test('has no critical or serious automated accessibility violations on List and Detail', async ({ page }) => {
    await mockCustomersSession(page);
    await mockCustomersResource(page, [
      { id: '1', name: 'Jane Shopper', email: 'jane@example.test', phone: null, status: 'active', version: 1, createdAt: '2026-08-01T00:00:00Z', addresses: [] },
    ]);

    await page.goto('/customers');
    await expect(page.getByText('Jane Shopper')).toBeVisible();
    let scan = await new AxeBuilder({ page }).include('main').exclude('thead').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    await page.goto('/customers/1');
    await expect(page.getByRole('heading', { name: 'Jane Shopper' })).toBeVisible();
    scan = await new AxeBuilder({ page }).include('main').analyze();
    expect(scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
