import { lazy } from 'react';
import { DollarSign } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { ModuleNavItem, ModuleRoute } from '../../registry/types.js';

/**
 * Pricing — Phase 2.4, on top of the real, already-complete backend Pricing
 * module (`apps/backend/app/Domains/Commerce/Pricing/`). Registered through
 * the identical `registerModule()` mechanism Catalog/Inventory already
 * use — no Admin Shell/router/Sidebar change required.
 *
 * Slice 1 (approved via `planning/reviews/
 * PHASE_2_4_PRICING_ARCHITECTURE_REVIEW.md`): Price Lists CRUD + Price List
 * Entries CRUD (entries live inside the Price List's own detail drawer, not
 * a separate top-level page — no cross-list entry endpoint exists to
 * justify one, the identical shape that put Inventory's own Stock
 * Reservations in a drawer in Slice 2).
 *
 * Slice 2 (Merchant Pricing Tools — `planning/reviews/
 * PHASE_2_4_SLICE_2_MERCHANT_TOOLS_REPORT.md`): four read-mostly tools on
 * top of the same backend, each its own top-level route rather than tabs
 * behind one — matching this codebase's own precedent of one nav item per
 * distinct workflow (Inventory's Warehouses/Stock Levels/Reservations/
 * Transfers/Activity), not tabs hiding genuinely separate tools from each
 * other. No new endpoint, table, permission, or business rule anywhere in
 * this slice.
 *
 * Slice 3 (Tax Engine — `planning/reviews/
 * PHASE_2_4_SLICE_3_TAX_ENGINE_REPORT.md`): Tax Zones/Classes/Rates CRUD
 * against the already-complete backend Tax module. Same "no restore"
 * design as Price Lists (no restore endpoint exists for any of Pricing's
 * four archivable entities) and the same "fetch the complete, low-
 * cardinality collection, search/filter/paginate client-side" shape —
 * confirmed by reading `TaxZoneController`/`TaxClassController`/
 * `TaxRateController` directly: none of the three support a `sort` or
 * free-text `search` param. Three more top-level nav items, matching this
 * module's own Slice 2 precedent — no Admin Shell/shared UI change.
 */

const routes: ModuleRoute[] = [
  {
    path: 'pricing/price-lists',
    element: lazy(() => import('./priceLists/PriceListsListPage.js').then((m) => ({ default: m.PriceListsListPage }))),
    breadcrumb: 'Price Lists',
    permissions: ['pricing.price_lists.view'],
  },
  {
    path: 'pricing/lookup',
    element: lazy(() => import('./priceTools/PriceLookupPage.js').then((m) => ({ default: m.PriceLookupPage }))),
    breadcrumb: 'Price Lookup',
    permissions: ['pricing.price_lists.view'],
  },
  {
    path: 'pricing/checkout-preview',
    element: lazy(() => import('./priceTools/CheckoutPricePreviewPage.js').then((m) => ({ default: m.CheckoutPricePreviewPage }))),
    breadcrumb: 'Checkout Price Preview',
    permissions: ['pricing.price_lists.view'],
  },
  {
    path: 'pricing/missing-prices',
    element: lazy(() => import('./priceTools/MissingPriceDetectionPage.js').then((m) => ({ default: m.MissingPriceDetectionPage }))),
    breadcrumb: 'Missing Prices',
    permissions: ['pricing.price_lists.view'],
  },
  {
    path: 'pricing/currency-coverage',
    element: lazy(() => import('./priceTools/CurrencyCoveragePage.js').then((m) => ({ default: m.CurrencyCoveragePage }))),
    breadcrumb: 'Currency Coverage',
    permissions: ['pricing.price_lists.view'],
  },
  {
    path: 'pricing/tax-zones',
    element: lazy(() => import('./tax/TaxZonesListPage.js').then((m) => ({ default: m.TaxZonesListPage }))),
    breadcrumb: 'Tax Zones',
    permissions: ['pricing.tax.view'],
  },
  {
    path: 'pricing/tax-classes',
    element: lazy(() => import('./tax/TaxClassesListPage.js').then((m) => ({ default: m.TaxClassesListPage }))),
    breadcrumb: 'Tax Classes',
    permissions: ['pricing.tax.view'],
  },
  {
    path: 'pricing/tax-rates',
    element: lazy(() => import('./tax/TaxRatesListPage.js').then((m) => ({ default: m.TaxRatesListPage }))),
    breadcrumb: 'Tax Rates',
    permissions: ['pricing.tax.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'pricing',
    label: 'Pricing',
    icon: DollarSign,
    children: [
      { id: 'pricing-price-lists', label: 'Price Lists', path: 'pricing/price-lists', permissions: ['pricing.price_lists.view'] },
      { id: 'pricing-lookup', label: 'Price Lookup', path: 'pricing/lookup', permissions: ['pricing.price_lists.view'] },
      { id: 'pricing-checkout-preview', label: 'Checkout Preview', path: 'pricing/checkout-preview', permissions: ['pricing.price_lists.view'] },
      { id: 'pricing-missing-prices', label: 'Missing Prices', path: 'pricing/missing-prices', permissions: ['pricing.price_lists.view'] },
      { id: 'pricing-currency-coverage', label: 'Currency Coverage', path: 'pricing/currency-coverage', permissions: ['pricing.price_lists.view'] },
      { id: 'pricing-tax-zones', label: 'Tax Zones', path: 'pricing/tax-zones', permissions: ['pricing.tax.view'] },
      { id: 'pricing-tax-classes', label: 'Tax Classes', path: 'pricing/tax-classes', permissions: ['pricing.tax.view'] },
      { id: 'pricing-tax-rates', label: 'Tax Rates', path: 'pricing/tax-rates', permissions: ['pricing.tax.view'] },
    ],
  },
];

registerModule({ id: 'pricing', navigation, routes });
