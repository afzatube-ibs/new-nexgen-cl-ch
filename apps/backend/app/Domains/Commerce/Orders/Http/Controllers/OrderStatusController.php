<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Controllers;

use App\Domains\Commerce\Orders\Actions\CancelOrderAction;
use App\Domains\Commerce\Orders\Actions\ConfirmOrderAction;
use App\Domains\Commerce\Orders\Actions\DeliverOrderAction;
use App\Domains\Commerce\Orders\Actions\ShipOrderAction;
use App\Domains\Commerce\Orders\Actions\StartProcessingOrderAction;
use App\Domains\Commerce\Orders\Http\Requests\CancelOrderRequest;
use App\Domains\Commerce\Orders\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Orders\Http\Resources\OrderResource;
use App\Domains\Commerce\Orders\Models\Order;

/**
 * "Order status lifecycle" made concrete as one endpoint per named
 * transition, rather than a single generic status-update endpoint — an
 * explicit business action per transition (mirrors Pricing's/Promotions'
 * own "archive" as a dedicated action distinct from a generic update).
 */
final class OrderStatusController
{
    public function __construct(
        private readonly ConfirmOrderAction $confirmOrderAction,
        private readonly StartProcessingOrderAction $startProcessingOrderAction,
        private readonly ShipOrderAction $shipOrderAction,
        private readonly DeliverOrderAction $deliverOrderAction,
        private readonly CancelOrderAction $cancelOrderAction,
    ) {}

    public function confirm(ExpectedVersionRequest $request, Order $order): OrderResource
    {
        $updated = $this->confirmOrderAction->execute(
            order: $order,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new OrderResource($updated);
    }

    public function startProcessing(ExpectedVersionRequest $request, Order $order): OrderResource
    {
        $updated = $this->startProcessingOrderAction->execute(
            order: $order,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new OrderResource($updated);
    }

    public function ship(ExpectedVersionRequest $request, Order $order): OrderResource
    {
        $updated = $this->shipOrderAction->execute(
            order: $order,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new OrderResource($updated);
    }

    public function deliver(ExpectedVersionRequest $request, Order $order): OrderResource
    {
        $updated = $this->deliverOrderAction->execute(
            order: $order,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new OrderResource($updated);
    }

    public function cancel(CancelOrderRequest $request, Order $order): OrderResource
    {
        $updated = $this->cancelOrderAction->execute(
            order: $order,
            reason: $request->string('reason')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new OrderResource($updated);
    }
}
