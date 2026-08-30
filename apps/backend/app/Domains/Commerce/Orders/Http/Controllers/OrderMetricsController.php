<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Controllers;

use App\Domains\Commerce\Orders\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets) —
 * the two small, read-only aggregate queries the real Dashboard widgets
 * need (order/revenue counts by period, top-selling products by quantity)
 * that no existing endpoint provides. `OrderController::index()` supports
 * no date-range filter and no aggregate at all — a dashboard KPI computed
 * by paging through every order client-side would be both dishonestly
 * unbounded and slow, so this is a genuinely additive, narrowly-scoped
 * capability: a pure read query, no new business logic, no write path,
 * gated by the same `orders.orders.view` permission `OrderController::
 * index()` already requires (this exposes strictly a rollup of the same
 * underlying data a viewer can already list one order at a time).
 *
 * Both methods query via the plain `DB` query builder rather than the
 * `Order`/`OrderItem` Eloquent models: a `SUM`/`GROUP BY` aggregate row
 * has no relationship to either model's own real attributes or casts (see
 * `revenueByCurrency()`'s own docblock), so building it through Eloquent
 * would only invite exactly the kind of undefined-attribute confusion the
 * platform's own recurring decimal-cast bug class already came from.
 */
final class OrderMetricsController
{
    /**
     * `pendingOrders` counts every order currently `pending`, regardless of
     * when it was placed — the real, actionable "needs attention" count.
     * `ordersToday`/`ordersThisMonth` count every order placed in that
     * window regardless of status (a cancelled order was still genuinely
     * placed). `revenueToday`/`revenueThisMonth` sum `grand_total` for
     * orders placed in that window that are NOT cancelled — a cancelled
     * order was never fulfilled and does not represent real revenue.
     *
     * Revenue is returned as one entry per real `currency_code` actually
     * present in the window, never blended into one number — this
     * platform's own real order data spans more than one currency
     * (confirmed directly against the dev database), and summing across
     * currencies without a real conversion would be a fabricated number,
     * not a real one.
     */
    public function summary(Request $request): JsonResponse
    {
        $todayStart = now()->startOfDay();
        $monthStart = now()->startOfMonth();

        $pendingOrders = Order::query()->where('status', Order::STATUS_PENDING)->count();

        $ordersToday = Order::query()->where('placed_at', '>=', $todayStart)->count();
        $ordersThisMonth = Order::query()->where('placed_at', '>=', $monthStart)->count();

        return response()->json(['data' => [
            'pendingOrders' => $pendingOrders,
            'ordersToday' => $ordersToday,
            'ordersThisMonth' => $ordersThisMonth,
            'revenueToday' => $this->revenueByCurrency($todayStart),
            'revenueThisMonth' => $this->revenueByCurrency($monthStart),
        ]]);
    }

    /**
     * @return list<array{currencyCode: string, amount: string}>
     */
    private function revenueByCurrency(Carbon $since): array
    {
        $rows = DB::table('orders')
            ->where('placed_at', '>=', $since)
            ->where('status', '!=', Order::STATUS_CANCELLED)
            ->selectRaw('currency_code, SUM(grand_total) as total')
            ->groupBy('currency_code')
            ->orderBy('currency_code')
            ->get()
            ->all();

        return array_values(array_map(
            // `SUM()` returns a raw driver value (a PHP string on
            // MySQL/PostgreSQL, but SQLite hands back a float for an
            // aggregate — never the model's own `decimal:4` cast, since
            // this is a raw select, not a hydrated attribute).
            // `number_format` normalizes both to the same real precision
            // this platform's money columns use everywhere else, rather
            // than emitting a bare, driver-dependent number.
            static fn (object $row): array => [
                'currencyCode' => (string) $row->currency_code,
                'amount' => number_format((float) $row->total, 4, '.', ''),
            ],
            $rows,
        ));
    }

    /**
     * Top-selling products by real total quantity sold, all-time. Reads
     * `order_items`' own `sku`/`product_name` snapshot columns directly —
     * Orders has no code-level dependency on Catalog (see the
     * order_items migration's own docblock), so this never joins out to
     * Catalog for a live product name; it reports exactly what was
     * actually sold, under the name it was sold as.
     */
    public function topProducts(Request $request): JsonResponse
    {
        $limit = max(1, min(20, (int) $request->integer('limit', 5)));

        $rows = DB::table('order_items')
            ->selectRaw('sku, MAX(product_name) as product_name, SUM(quantity) as total_quantity')
            ->groupBy('sku')
            ->orderByDesc('total_quantity')
            ->limit($limit)
            ->get()
            ->all();

        return response()->json(['data' => array_map(
            static fn (object $row): array => [
                'sku' => (string) $row->sku,
                'productName' => (string) $row->product_name,
                'totalQuantity' => (int) $row->total_quantity,
            ],
            $rows,
        )]);
    }
}
