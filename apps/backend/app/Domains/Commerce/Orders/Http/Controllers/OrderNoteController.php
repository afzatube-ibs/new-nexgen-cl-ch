<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Controllers;

use App\Domains\Commerce\Orders\Actions\AddOrderNoteAction;
use App\Domains\Commerce\Orders\Http\Requests\AddOrderNoteRequest;
use App\Domains\Commerce\Orders\Http\Resources\OrderNoteResource;
use App\Domains\Commerce\Orders\Models\Order;
use Illuminate\Http\JsonResponse;

final class OrderNoteController
{
    public function __construct(private readonly AddOrderNoteAction $addOrderNoteAction) {}

    public function store(AddOrderNoteRequest $request, Order $order): JsonResponse
    {
        $note = $this->addOrderNoteAction->execute(
            order: $order,
            body: $request->string('body')->toString(),
            isCustomerVisible: $request->boolean('is_customer_visible'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return (new OrderNoteResource($note))->response()->setStatusCode(201);
    }
}
