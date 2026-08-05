<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Controllers;

use App\Domains\Commerce\Orders\Actions\CreateOrderAction;
use App\Domains\Commerce\Orders\Http\Requests\CreateOrderRequest;
use App\Domains\Commerce\Orders\Http\Resources\OrderResource;
use App\Domains\Commerce\Orders\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Staff-facing Order creation and lookup — MODULE:ORDERS' public contract,
 * per planning/IMPLEMENTATION_MASTER_PLAN.md ("Order CRUD (create via
 * Checkout only)"). No update or delete endpoint exists here: an Order's
 * only mutations after creation are the status-transition endpoints (see
 * OrderStatusController) and adding a note (see OrderNoteController) — see
 * Models\Order's docblock for why. Every action here is behind
 * `permission:orders.orders.*` middleware (see routes.php).
 */
final class OrderController
{
    public function __construct(private readonly CreateOrderAction $createOrderAction) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Order::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->string('customer_id')->toString());
        }

        return OrderResource::collection($query->orderByDesc('placed_at')->paginate());
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource($order->load(['items', 'addresses', 'discounts', 'notes', 'timelineEvents']));
    }

    public function store(CreateOrderRequest $request): JsonResponse
    {
        $order = $this->createOrderAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new OrderResource($order))->response()->setStatusCode(201);
    }
}
