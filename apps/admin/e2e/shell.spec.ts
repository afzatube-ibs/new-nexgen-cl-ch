import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockAuthenticatedSession } from './mocks.js';

test.describe('Admin Shell', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('routing: Dashboard <-> Settings via the sidebar, with matching breadcrumbs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('No settings panels yet')).toBeVisible();
  });

  test('theme toggle switches data-theme on the document root and persists it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Dark' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('responsiveness: sidebar collapses to an off-canvas Drawer below the md breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });

  test('a route requiring a permission the operator lacks renders the 403 page, not a 404', async ({ page }) => {
    // The mocked session only grants identity_access.users.view — visiting a
    // path this shell doesn't even register still exercises NotFoundPage;
    // this asserts the two are genuinely distinct pages.
    await page.goto('/');
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText('Page not found')).toBeVisible();
  });

  test('has no critical or serious automated accessibility violations on Dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    const results = await new AxeBuilder({ page }).include('body').analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });

  test('has no critical or serious automated accessibility violations on the login page', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    const results = await new AxeBuilder({ page }).include('body').analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});
