<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Controllers;

use App\Domains\Commerce\Checkout\Actions\SubmitCheckoutAction;
use App\Domains\Commerce\Checkout\Http\Requests\SubmitCheckoutRequest;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Orders\Http\Resources\OrderResource;

final class CheckoutSubmissionController
{
    public function __construct(private readonly SubmitCheckoutAction $submitCheckoutAction) {}

    public function __invoke(SubmitCheckoutRequest $request, CheckoutSession $session): OrderResource
    {
        $order = $this->submitCheckoutAction->execute(
            session: $session,
            idempotencyKey: $request->string('idempotency_key')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new OrderResource($order->load(['items', 'addresses', 'discounts']));
    }
}
