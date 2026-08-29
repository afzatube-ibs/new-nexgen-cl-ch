<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Controllers;

use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Orders\Http\Resources\OrderResource;
use App\Domains\Commerce\Orders\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — real
 * order history for a logged-in customer. Deliberately a separate
 * controller from the staff-facing OrderController, not a shared method:
 * `OrderController::index()` accepts an arbitrary `customer_id` query
 * param (correct for staff, who legitimately look up any customer's
 * orders) and `OrderController::show()` performs no ownership check at
 * all (correct today only because every caller reaching it already holds
 * the staff `orders.orders.view` permission). Neither behavior is safe to
 * expose to a customer principal, so this controller ALWAYS scopes to the
 * caller's own id — a customer can never request another customer's
 * `customer_id`, because the query never reads one from the request.
 *
 * Orders' own arch rule ("Orders never depends on Catalog, Inventory,
 * Pricing, Promotions, Identity & Access, Store Configuration, or Media
 * internals") does not name Customers — Orders already has one real,
 * legitimate dependency on it (Actions\CreateOrderAction reads a
 * Customer's live record at order-creation time; see
 * tests/Arch/ArchitectureTest.php's own "Orders" section) — so importing
 * `Customer` here only for `$request->user()`'s type is consistent with
 * an already-established boundary, not a new one.
 */
final class CustomerOrderController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $customer = $this->caller();

        $orders = Order::query()
            ->where('customer_id', $customer->id)
            ->orderByDesc('placed_at')
            ->paginate(perPage: (int) $request->integer('per_page', 20));

        return OrderResource::collection($orders);
    }

    /**
     * A 404, not a 403, for an order that exists but belongs to someone
     * else — never confirms or denies another customer's order exists,
     * per SECURITY:AUTHORIZATION.
     */
    public function show(Order $order): OrderResource
    {
        $customer = $this->caller();

        abort_if($order->customer_id !== $customer->id, 404);

        return new OrderResource($order->load(['items', 'addresses', 'discounts', 'notes', 'timelineEvents']));
    }

    /**
     * See Customers\Http\Controllers\CustomerAuthController::caller()'s
     * own docblock for why this reads the `sanctum` guard directly rather
     * than `Illuminate\Http\Request::user()`.
     */
    private function caller(): Customer
    {
        $customer = Auth::guard('sanctum')->user();

        abort_if(! $customer instanceof Customer, 401);

        return $customer;
    }
}
