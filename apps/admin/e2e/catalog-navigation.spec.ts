import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockAuthenticatedSession, mockCatalogSession, mockAllCatalogListsEmpty } from './mocks.js';

test.describe('Catalog navigation', () => {
  test('the Catalog nav group is hidden for an operator without any catalog.*.view permission', async ({ page }) => {
    await mockAuthenticatedSession(page); // only identity_access.users.view
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Products' })).toHaveCount(0);
  });

  test('the Catalog nav group and every child route render for an operator with catalog.*.view', async ({ page }) => {
    await mockCatalogSession(page);
    await mockAllCatalogListsEmpty(page);
    await page.goto('/');

    for (const [label, heading] of [
      ['Products', 'Products'],
      ['Brands', 'Brands'],
      ['Categories', 'Categories'],
      ['Collections', 'Collections'],
      ['Tags', 'Tags'],
      ['Attributes', 'Attributes'],
      ['Attribute Groups', 'Attribute Groups'],
      ['Options', 'Options'],
    ] as const) {
      await page.getByRole('link', { name: label, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      // Every module's empty state follows the same "No {things} yet" phrasing (never the DataTable's generic "No results" default).
      await expect(page.getByText(/No .+ yet/)).toBeVisible();
    }
  });

  test('has no critical or serious automated accessibility violations on the Products list', async ({ page }) => {
    await mockCatalogSession(page);
    await mockAllCatalogListsEmpty(page);
    await page.goto('/catalog/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

    const results = await new AxeBuilder({ page }).include('body').analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});
