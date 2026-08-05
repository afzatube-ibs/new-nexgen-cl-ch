<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Controllers;

use App\Domains\Commerce\Checkout\Actions\AddCheckoutItemAction;
use App\Domains\Commerce\Checkout\Actions\RemoveCheckoutItemAction;
use App\Domains\Commerce\Checkout\Actions\UpdateCheckoutItemAction;
use App\Domains\Commerce\Checkout\Http\Requests\AddCheckoutItemRequest;
use App\Domains\Commerce\Checkout\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Checkout\Http\Requests\UpdateCheckoutItemRequest;
use App\Domains\Commerce\Checkout\Http\Resources\CheckoutItemResource;
use App\Domains\Commerce\Checkout\Models\CheckoutItem;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

final class CheckoutItemController
{
    public function __construct(
        private readonly AddCheckoutItemAction $addCheckoutItemAction,
        private readonly UpdateCheckoutItemAction $updateCheckoutItemAction,
        private readonly RemoveCheckoutItemAction $removeCheckoutItemAction,
    ) {}

    public function store(AddCheckoutItemRequest $request, CheckoutSession $session): JsonResponse
    {
        $item = $this->addCheckoutItemAction->execute(
            session: $session,
            attributes: $request->validated(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return (new CheckoutItemResource($item))->response()->setStatusCode(201);
    }

    public function update(UpdateCheckoutItemRequest $request, CheckoutSession $session, CheckoutItem $item): CheckoutItemResource
    {
        $updated = $this->updateCheckoutItemAction->execute(
            session: $session,
            item: $item,
            quantity: (int) $request->integer('quantity'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CheckoutItemResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, CheckoutSession $session, CheckoutItem $item): Response
    {
        $this->removeCheckoutItemAction->execute(
            session: $session,
            item: $item,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
