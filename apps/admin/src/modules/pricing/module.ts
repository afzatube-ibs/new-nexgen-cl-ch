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
 * Reservations in a drawer in Slice 2). Tax Zones/Classes/Rates are a
 * later slice, conditioned on the architecture review's own Tax Class
 * ownership decision — not represented here.
 */

const routes: ModuleRoute[] = [
  {
    path: 'pricing/price-lists',
    element: lazy(() => import('./priceLists/PriceListsListPage.js').then((m) => ({ default: m.PriceListsListPage }))),
    breadcrumb: 'Price Lists',
    permissions: ['pricing.price_lists.view'],
  },
];

const navigation: ModuleNavItem[] = [
  {
    id: 'pricing',
    label: 'Pricing',
    icon: DollarSign,
    children: [{ id: 'pricing-price-lists', label: 'Price Lists', path: 'pricing/price-lists', permissions: ['pricing.price_lists.view'] }],
  },
];

registerModule({ id: 'pricing', navigation, routes });
