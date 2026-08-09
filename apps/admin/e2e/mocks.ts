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
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ json: { data: fakeUser(), meta: { token: 'fake-token-for-e2e' } } });
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
