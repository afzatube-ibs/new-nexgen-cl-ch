# Milestone 8 — Dashboard Real Widgets — Completion Report

**Source of truth**: `PRODUCTION_COMPLETION_PLAN_v2.md`. First milestone this session in the "customer features" → shared-infrastructure tier (Dashboard is the first screen every operator sees, regardless of which business modules they use).

## Part 0 — The Plan Corrected Against the Repository

Verified before implementation, per the standing "verify against the code, correct the plan when wrong" discipline:

- **The registry framework itself was already real and fully tested** — `DashboardWidgetDefinition`, `getDashboardWidgets()` (permission-filtered), `DashboardPage.tsx` (renders whatever's registered in a real 12-column grid). Confirmed zero modules registered any widget yet.
- **The plan's own "no new backend work needed" assumption was wrong for 2 of the 9 widgets.** `OrderController::index()` has no date-range filter and no aggregate capability at all — computing "Today's Revenue"/"This Month's Revenue" honestly would have meant either fabricating numbers or paging through a client-side sum with no real bound. `StockItemController::index()` had no way to find low-stock items short of fetching every SKU in the catalog. Both are genuine, narrow gaps — not solvable by reusing an existing endpoint, and not something to work around by inventing client-side aggregation. Two small, additive, read-only backend endpoints were added instead (Part 1).

## Part 1 — What Shipped

### Backend (`apps/backend`)
- **`OrderMetricsController`** (new) — `GET /orders/metrics` (pending/today/this-month order counts, today/this-month revenue per real currency) and `GET /orders/top-products` (all-time top sellers by real quantity, read from `order_items`' own snapshot columns — no Catalog dependency). Both `orders.orders.view`, both pure read aggregates via the plain `DB` query builder — no new business logic, no write path.
- **`StockItemController::index()`** — a new `quantity_lte` filter (plus matching ascending sort) against the real `quantity_on_hand - quantity_reserved` expression, since `StockItem` has no stored "available" column.
- **A 6th instance of the recurring SQLite decimal-cast bug**, found while building the revenue widgets and fixed: `Order`, `OrderItem`, `OrderDiscount`, `Currency`, and `PromotionRedemption` were all missing the `decimal:N` casts their own migrations' precision requires — the platform's own central financial models, silently returning whole-number amounts as PHP `int` under this installation's SQLite dev database. See the dedicated commit (`7405db9`) and its own `DecimalCastRegressionTest.php` for the full sweep.

### `packages/api-client`
- **`orders/metrics.ts`** (new) — `getOrderMetrics()`, `getTopSellingProducts()`.
- **`inventory/stockItems.ts`** (extended) — `listStockItems()` gained `quantityLte`.

### Admin (`apps/admin`)
- **`framework/DashboardWidgetCard.tsx`** (new) — the one shared structural wrapper every widget uses: title/icon/optional action, plus the same loading-skeleton/error-retry states this codebase's list/detail pages already establish. No widget invents its own loading or error presentation.
- **Orders module** (`modules/orders/widgets/`): `PendingOrdersWidget`, `TodaysOrdersWidget`, `TodaysRevenueWidget`, `ThisMonthRevenueWidget`, `RecentOrdersWidget`, `TopSellingProductsWidget`, `RecentActivityWidget` (gated by `orders.audit_log.view`, distinct from the other six's `orders.orders.view` — it reads a more sensitive endpoint). The four metrics-backed widgets all read the same `useOrderMetrics()` query; React Query's cache dedupes this to one real network call regardless of how many mount at once.
- **Inventory module** (`modules/inventory/widgets/LowStockWidget.tsx`) — reuses the already-real `LOW_STOCK_THRESHOLD` constant `stockHealth.ts` defines for the Stock Levels page's own badge coloring, rather than inventing a second threshold. Deliberately includes out-of-stock items, unlike that page's own separate display category — a dashboard "needs restocking" widget is honestly more urgent than a list-row badge.
- **Customers module** (`modules/customers/widgets/LatestCustomersWidget.tsx`) — reuses the already-real, already-sorted `listCustomers()`.
- All 8 widget components registered through each module's own existing `registerModule()` call (`dashboardWidgets` field) — zero Admin Shell/router/Sidebar/DashboardPage changes.

### A real, small gap found and fixed while wiring the Pending Orders widget's own link
`OrdersListPage` already read `customer_id` from the URL to seed its filter (used by `CustomerRecentOrdersCard`'s own "View all" link) but never `status` — a `?status=pending` deep link was silently ignored, landing on the unfiltered list. Fixed to mirror the existing `customer_id` pattern exactly, so the Pending Orders widget's link actually filters. Live-verified.

## Part 2 — Multi-Currency Revenue, Handled Honestly

This platform's real order data spans more than one currency — confirmed directly against the dev database (`USD`, `BDT` both present). Both revenue widgets return one entry per real currency actually placed in the window, never blended into a single fabricated number (`OrderMetricsController::revenueByCurrency()`'s own docblock states why). Live-verified: "This Month's Revenue" correctly rendered two lines — `BDT 39,935.00` and `$256.00` — rather than a nonsensical combined figure.

## Part 3 — Verification

| Check | Result |
|---|---|
| Backend Pest (targeted, every domain touched or adjacent) | **734/734 passed**, zero regressions (see the dedicated decimal-cast-sweep and Milestone 8 backend commits for the full domain list). New tests: `OrderMetricsTest` (7), `StockItemListingTest` (4), `DecimalCastRegressionTest` (5). PHPStan/Pint clean on every touched file. |
| `packages/api-client` typecheck | Clean |
| `packages/api-client` tests | **197/197 passed** (193 prior + 4 new). |
| Admin typecheck | Clean |
| Admin lint | Clean |
| Admin tests | **156/156 passed** (unchanged — no new pure-function logic to unit-test in isolation beyond what the widgets' own data hooks already exercise). |
| Admin production build | Succeeded — all 8 new widgets and `DashboardWidgetCard` each correctly code-split into their own lazy-loaded chunk (0.89 KB–2.08 KB each). |

### Live, end-to-end verification (real backend + real Admin app + real browser)
1. Created a real administrator account, signed into the real Admin app.
2. Confirmed all 9 named widgets render on `/` with real data: Low Stock ("Nothing is running low right now" — honestly empty), Latest Customers (5 real customers, newest first), Pending Orders (9), Today's Orders (0), Today's Revenue ("No revenue yet today"), This Month's Revenue (two real currency lines), Top Selling Products (5 real SKUs by real quantity sold), Recent Orders (5 real orders with real status badges), Recent Activity (5 real audit-log entries, actor names resolved).
3. Followed the Pending Orders widget's own link to `/orders?status=pending` and confirmed the list actually filters (the fix in Part 1).
4. Deleted the test administrator account from the dev database afterward.

## Part 4 — Remaining, Honest Gaps

- **No environment-driven currency conversion** — revenue is shown per real currency rather than converted to one, by design (Part 2); a merchant wanting one blended figure would need a real, explicit conversion decision, out of this milestone's scope.
- **"Recent Activity" is Orders-only** — no unified cross-domain activity feed exists on the real backend (every module owns its own separate audit log); naming and scoping this widget honestly to what it actually shows was preferred over fabricating a platform-wide feed by merging several modules' logs together.
- **Top Selling Products is all-time, not a rolling window** — the simplest, most honest default given no existing convention for a time-boxed "trending" query; a real "trending this week/month" variant would be a reasonable, small follow-up.

---
