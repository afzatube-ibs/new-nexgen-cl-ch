import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockLoginSuccess, mockLoginFailure } from './mocks.js';

test.describe('Authentication', () => {
  test('an unauthenticated visitor is redirected to /login, carrying returnTo', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login\?returnTo=/);
  });

  test('a successful login redirects to the originally-requested route and renders the shell', async ({ page }) => {
    await mockLoginSuccess(page);
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('Email').fill('jordan@example.com');
    await page.getByLabel('Password').fill('correct-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });

  test('an invalid login shows the server-mapped error without navigating away', async ({ page }) => {
    await mockLoginFailure(page);
    await page.goto('/login');

    await page.getByLabel('Email').fill('jordan@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('These credentials do not match our records.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('session restore renders the shell directly when a token is already present', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');

    await expect(page.getByText('Jordan Rivera')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('signing out clears the session and returns to /login', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.route('**/api/v1/auth/logout', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });
    await page.goto('/');

    await page.getByRole('button', { name: /Jordan Rivera/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});
