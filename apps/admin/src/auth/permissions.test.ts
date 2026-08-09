import { describe, expect, it } from 'vitest';
import type { UserDTO } from '@nexgen/api-client';
import { permissionSet, hasPermission, hasAnyPermission } from './permissions.js';

function userWith(...keys: string[]): UserDTO {
  return {
    id: '1',
    name: 'Operator',
    email: 'operator@example.com',
    status: 'active',
    version: 1,
    createdAt: null,
    updatedAt: null,
    roles: [
      {
        id: 'r1',
        name: 'role',
        label: 'Role',
        version: 1,
        createdAt: null,
        updatedAt: null,
        permissions: keys.map((key) => ({ key, label: key, module: key.split('.')[0]! })),
      },
    ],
  };
}

describe('permissionSet / hasPermission / hasAnyPermission', () => {
  it('flattens roles -> permissions into one set', () => {
    const set = permissionSet(userWith('catalog.products.view', 'catalog.products.manage'));
    expect(set.has('catalog.products.view')).toBe(true);
    expect(set.has('catalog.products.manage')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('returns an empty set for a null user', () => {
    expect(permissionSet(null).size).toBe(0);
  });

  it('returns an empty set, not a crash, when roles is absent (e.g. a fresh /auth/login response, which never eager-loads roles)', () => {
    const loginResponseShapedUser = { ...userWith(), roles: undefined } as unknown as UserDTO;
    expect(() => permissionSet(loginResponseShapedUser)).not.toThrow();
    expect(permissionSet(loginResponseShapedUser).size).toBe(0);
  });

  it('hasPermission checks exact membership', () => {
    const set = permissionSet(userWith('catalog.products.view'));
    expect(hasPermission(set, 'catalog.products.view')).toBe(true);
    expect(hasPermission(set, 'catalog.products.manage')).toBe(false);
  });

  it('hasAnyPermission treats an empty requirement list as "no restriction"', () => {
    expect(hasAnyPermission(new Set(), [])).toBe(true);
  });

  it('hasAnyPermission is satisfied by any one of several equally-sufficient keys', () => {
    const set = new Set(['catalog.products.manage']);
    expect(hasAnyPermission(set, ['catalog.products.view', 'catalog.products.manage'])).toBe(true);
    expect(hasAnyPermission(set, ['catalog.products.view'])).toBe(false);
  });
});
