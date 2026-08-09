import { describe, expect, it, afterEach } from 'vitest';
import { registerModule, getNavigationTree, getAllRoutes, getDashboardWidgets, getSettingsPanels, _resetRegistryForTests } from './moduleRegistry.js';

function Noop() {
  return null;
}

describe('moduleRegistry', () => {
  afterEach(() => {
    _resetRegistryForTests();
  });

  it('throws when the same module id is registered twice', () => {
    registerModule({ id: 'catalog' });
    expect(() => registerModule({ id: 'catalog' })).toThrow('already registered');
  });

  it('aggregates navigation across every registered module', () => {
    registerModule({ id: 'a', navigation: [{ id: 'a-nav', label: 'A', path: '/a' }] });
    registerModule({ id: 'b', navigation: [{ id: 'b-nav', label: 'B', path: '/b' }] });

    const tree = getNavigationTree(new Set());
    expect(tree.map((item) => item.id)).toEqual(['a-nav', 'b-nav']);
  });

  it('hides a navigation entry the operator lacks permission for — never disabled-but-shown', () => {
    registerModule({
      id: 'catalog',
      navigation: [{ id: 'products', label: 'Products', path: '/catalog/products', permissions: ['catalog.products.view'] }],
    });

    expect(getNavigationTree(new Set())).toHaveLength(0);
    expect(getNavigationTree(new Set(['catalog.products.view']))).toHaveLength(1);
  });

  it('drops a parent nav item with no visible children and no path of its own', () => {
    registerModule({
      id: 'catalog',
      navigation: [
        {
          id: 'catalog-group',
          label: 'Catalog',
          children: [{ id: 'products', label: 'Products', path: '/catalog/products', permissions: ['catalog.products.view'] }],
        },
      ],
    });

    expect(getNavigationTree(new Set())).toHaveLength(0);
    expect(getNavigationTree(new Set(['catalog.products.view']))).toHaveLength(1);
  });

  it('aggregates routes across every registered module', () => {
    registerModule({ id: 'a', routes: [{ path: 'a', element: Noop, breadcrumb: 'A' }] });
    registerModule({ id: 'b', routes: [{ path: 'b', element: Noop, breadcrumb: 'B' }] });

    expect(getAllRoutes().map((r) => r.path)).toEqual(['a', 'b']);
  });

  it('filters dashboard widgets and settings panels by permission', () => {
    registerModule({
      id: 'catalog',
      dashboardWidgets: [{ id: 'low-stock', span: 6, permissions: ['catalog.products.view'], component: Noop }],
      settingsPanels: [{ id: 'catalog-settings', label: 'Catalog', permissions: ['catalog.settings.manage'], component: Noop }],
    });

    expect(getDashboardWidgets(new Set())).toHaveLength(0);
    expect(getDashboardWidgets(new Set(['catalog.products.view']))).toHaveLength(1);
    expect(getSettingsPanels(new Set(['catalog.settings.manage']))).toHaveLength(1);
  });
});
