<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Controllers;

use App\Domains\Commerce\Checkout\Actions\StartCheckoutAction;
use App\Domains\Commerce\Checkout\Http\Requests\StartCheckoutRequest;
use App\Domains\Commerce\Checkout\Http\Resources\CheckoutSessionResource;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Http\JsonResponse;

/**
 * "Checkout session" management — MODULE:CHECKOUT's public contract, per
 * planning/IMPLEMENTATION_MASTER_PLAN.md. No index/update/delete endpoint
 * here: a session is looked up only by its own id (there is no operator
 * "browse all carts" use case this module's requirements name), and every
 * mutation past creation has its own dedicated, explicit endpoint (item,
 * address, shipping, coupon, review, submit) rather than a generic PATCH.
 */
final class CheckoutSessionController
{
    public function __construct(private readonly StartCheckoutAction $startCheckoutAction) {}

    public function show(CheckoutSession $session): CheckoutSessionResource
    {
        return new CheckoutSessionResource($session->load('items'));
    }

    public function store(StartCheckoutRequest $request): JsonResponse
    {
        $session = $this->startCheckoutAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new CheckoutSessionResource($session))->response()->setStatusCode(201);
    }
}
