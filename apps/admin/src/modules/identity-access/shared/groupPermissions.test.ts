import { describe, expect, it } from 'vitest';
import type { PermissionDTO } from '@nexgen/api-client';
import { groupPermissionsByModule } from './groupPermissions.js';

function permission(key: string, module: string): PermissionDTO {
  return { key, label: key, module };
}

describe('groupPermissionsByModule', () => {
  it('groups permissions by their real module field', () => {
    const permissions = [permission('orders.orders.view', 'orders'), permission('customers.customers.view', 'customers'), permission('orders.orders.manage', 'orders')];

    const result = groupPermissionsByModule(permissions);

    expect(result).toEqual([
      ['customers', [permission('customers.customers.view', 'customers')]],
      ['orders', [permission('orders.orders.view', 'orders'), permission('orders.orders.manage', 'orders')]],
    ]);
  });

  it('sorts module groups alphabetically, matching PermissionController::index()\'s own orderBy(\'module\')', () => {
    const permissions = [permission('shipping.rates.view', 'shipping'), permission('appearance.branding.view', 'appearance')];

    const result = groupPermissionsByModule(permissions);

    expect(result.map(([moduleName]) => moduleName)).toEqual(['appearance', 'shipping']);
  });

  it('returns an empty list for an empty catalog, never a crash', () => {
    expect(groupPermissionsByModule([])).toEqual([]);
  });
});
