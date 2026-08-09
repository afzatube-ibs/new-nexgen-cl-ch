import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockCatalogSession, mockCrudResource, type MockCatalogRecord } from './mocks.js';

const initialBrands: MockCatalogRecord[] = [
  { id: '1', name: 'Acme', slug: 'acme', description: null, logoMediaId: null, logoUrl: null, metaTitle: null, metaDescription: null, status: 'active', version: 1, createdAt: null, updatedAt: null },
  { id: '2', name: 'Globex', slug: 'globex', description: null, logoMediaId: null, logoUrl: null, metaTitle: null, metaDescription: null, status: 'active', version: 1, createdAt: null, updatedAt: null },
];

test.describe('Catalog — Brands', () => {
  test('create, edit (optimistic-lock conflict surfaced), archive, restore, and delete a brand', async ({ page }) => {
    await mockCatalogSession(page);
    await mockCrudResource(page, '/brands', []);
    await page.goto('/catalog/brands');

    // Create
    await page.getByRole('button', { name: 'New brand' }).click();
    await page.getByLabel('Name').fill('Initech');
    await page.getByRole('button', { name: 'Create brand' }).click();
    await expect(page.getByRole('cell', { name: 'Initech', exact: true })).toBeVisible();

    // Edit — real update
    await page.getByRole('row', { name: /Initech/ }).getByRole('button', { name: /Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel('Name').fill('Initech Renamed');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('cell', { name: 'Initech Renamed', exact: true })).toBeVisible();

    // Archive -> Restore
    await page.getByRole('row', { name: /Initech Renamed/ }).getByRole('button', { name: /Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Archive' }).click();
    await expect(page.getByRole('row', { name: /Initech Renamed/ }).getByText('archived')).toBeVisible();

    await page.getByRole('row', { name: /Initech Renamed/ }).getByRole('button', { name: /Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Restore' }).click();
    await expect(page.getByRole('row', { name: /Initech Renamed/ }).getByText('active')).toBeVisible();

    // Delete
    await page.getByRole('row', { name: /Initech Renamed/ }).getByRole('button', { name: /Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Initech Renamed', exact: true })).toHaveCount(0);
  });

  test('bulk archive reports a per-item failure and Retry failed succeeds afterward', async ({ page }) => {
    await mockCatalogSession(page);
    const brands = await mockCrudResource(page, '/brands', initialBrands);
    // Force Globex's first archive attempt to 409, proving the orchestration
    // layer records a real per-item failure rather than only ever
    // succeeding — then the retry goes through normally.
    brands.failOnce('2', 'archive');

    await page.goto('/catalog/brands');
    await expect(page.getByRole('cell', { name: 'Acme', exact: true })).toBeVisible();

    await page.getByRole('row', { name: /Acme/ }).getByLabel(/Select row/).check();
    await page.getByRole('row', { name: /Globex/ }).getByLabel(/Select row/).check();
    await page.getByRole('button', { name: 'Archive', exact: true }).click();

    await expect(page.getByText('1 succeeded, 1 failed of 2 total.')).toBeVisible();
    await expect(page.getByText('This record was changed elsewhere.')).toBeVisible();

    await page.getByRole('button', { name: /Retry failed/ }).click();
    await expect(page.getByText('2 succeeded, 0 failed of 2 total.')).toBeVisible();

    await page.getByRole('button', { name: 'Done' }).click();
  });

  test('CSV export downloads a file and CSV import reports a partial-failure summary', async ({ page }) => {
    await mockCatalogSession(page);
    await mockCrudResource(page, '/brands', initialBrands);
    await page.goto('/catalog/brands');
    await expect(page.getByRole('cell', { name: 'Acme', exact: true })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('brands.csv');

    await page.getByRole('button', { name: 'Import CSV' }).click();
    const csv = 'name,slug\nInitech,initech\n,missing-name\n';
    await page.setInputFiles('input[type="file"]', { name: 'brands.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.getByRole('button', { name: /^Import 2 rows$/ }).click();

    await expect(page.getByText(/1 of 2 rows imported\. Failed: row 2 \(Missing required field: name\)/)).toBeVisible();
  });

  test('has no critical or serious automated accessibility violations on the New Brand dialog', async ({ page }) => {
    await mockCatalogSession(page);
    await mockCrudResource(page, '/brands', []);
    await page.goto('/catalog/brands');

    await page.getByRole('button', { name: 'New brand' }).click();
    await expect(page.getByRole('dialog', { name: 'New brand' })).toBeVisible();

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});
