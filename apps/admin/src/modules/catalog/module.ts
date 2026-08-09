import { lazy } from 'react';
import { Package } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Catalog — Phase 2.2 Slice 1. The first business module built on top of
 * Phase 2.1's Admin Engine Foundation, registered through the identical
 * `registerModule()` mechanism the Dashboard/Settings "modules" already
 * use — no Admin Shell/router/Sidebar change required.
 *
 * Slice 1 scope: full taxonomy CRUD (Brands, Categories, Collections, Tags,
 * Attribute Groups, Attributes, Options) plus a basic Products module
 * (General + SEO fields only). Variants/Media/Organization/Relations/
 * Attribute-values/Activity land on Products in Slice 2 — see
 * PROJECT_STATUS.md.
 */

const routes: ModuleRoute[] = [
  {
    path: 'catalog/products',
    element: lazy(() => import('./products/ProductsListPage.js').then((m) => ({ default: m.ProductsListPage }))),
    breadcrumb: 'Products',
    permissions: ['catalog.products.view'],
  },
  {
    path: 'catalog/products/new',
    element: lazy(() => import('./products/ProductFormPage.js').then((m) => ({ default: m.ProductFormPage }))),
    breadcrumb: 'New Product',
    permissions: ['catalog.products.manage'],
  },
  {
    path: 'catalog/products/:id',
    element: lazy(() => import('./products/ProductFormPage.js').then((m) => ({ default: m.ProductFormPage }))),
    breadcrumb: 'Edit Product',
    permissions: ['catalog.products.view'],
  },
  {
    path: 'catalog/brands',
    element: lazy(() => import('./brands/BrandsListPage.js').then((m) => ({ default: m.BrandsListPage }))),
    breadcrumb: 'Brands',
    permissions: ['catalog.brands.view'],
  },
  {
    path: 'catalog/categories',
    element: lazy(() => import('./categories/CategoriesListPage.js').then((m) => ({ default: m.CategoriesListPage }))),
    breadcrumb: 'Categories',
    permissions: ['catalog.categories.view'],
  },
  {
    path: 'catalog/collections',
    element: lazy(() => import('./collections/CollectionsListPage.js').then((m) => ({ default: m.CollectionsListPage }))),
    breadcrumb: 'Collections',
    permissions: ['catalog.collections.view'],
  },
  {
    path: 'catalog/tags',
    element: lazy(() => import('./tags/TagsListPage.js').then((m) => ({ default: m.TagsListPage }))),
    breadcrumb: 'Tags',
    permissions: ['catalog.tags.view'],
  },
  {
    path: 'catalog/attributes',
    element: lazy(() => import('./attributes/AttributesListPage.js').then((m) => ({ default: m.AttributesListPage }))),
    breadcrumb: 'Attributes',
    permissions: ['catalog.attributes.view'],
  },
  {
    path: 'catalog/attribute-groups',
    element: lazy(() => import('./attributeGroups/AttributeGroupsListPage.js').then((m) => ({ default: m.AttributeGroupsListPage }))),
    breadcrumb: 'Attribute Groups',
    permissions: ['catalog.attributes.view'],
  },
  {
    path: 'catalog/options',
    element: lazy(() => import('./options/OptionsListPage.js').then((m) => ({ default: m.OptionsListPage }))),
    breadcrumb: 'Options',
    permissions: ['catalog.options.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'catalog',
    label: 'Catalog',
    icon: Package,
    children: [
      { id: 'catalog-products', label: 'Products', path: 'catalog/products', permissions: ['catalog.products.view'] },
      { id: 'catalog-brands', label: 'Brands', path: 'catalog/brands', permissions: ['catalog.brands.view'] },
      { id: 'catalog-categories', label: 'Categories', path: 'catalog/categories', permissions: ['catalog.categories.view'] },
      { id: 'catalog-collections', label: 'Collections', path: 'catalog/collections', permissions: ['catalog.collections.view'] },
      { id: 'catalog-tags', label: 'Tags', path: 'catalog/tags', permissions: ['catalog.tags.view'] },
      { id: 'catalog-attributes', label: 'Attributes', path: 'catalog/attributes', permissions: ['catalog.attributes.view'] },
      {
        id: 'catalog-attribute-groups',
        label: 'Attribute Groups',
        path: 'catalog/attribute-groups',
        permissions: ['catalog.attributes.view'],
      },
      { id: 'catalog-options', label: 'Options', path: 'catalog/options', permissions: ['catalog.options.view'] },
    ],
  },
];

registerModule({ id: 'catalog', navigation, routes });
