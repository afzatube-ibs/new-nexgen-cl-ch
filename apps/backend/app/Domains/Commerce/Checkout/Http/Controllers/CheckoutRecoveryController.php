<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Controllers;

use App\Domains\Commerce\Checkout\Actions\RecoverCheckoutSessionAction;
use App\Domains\Commerce\Checkout\Http\Resources\CheckoutSessionResource;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CheckoutRecoveryController
{
    public function __construct(private readonly RecoverCheckoutSessionAction $recoverCheckoutSessionAction) {}

    public function __invoke(Request $request, CheckoutSession $session): JsonResponse
    {
        $recovered = $this->recoverCheckoutSessionAction->execute(
            expiredSession: $session,
            actorId: $request->user()?->id,
        );

        return (new CheckoutSessionResource($recovered))->response()->setStatusCode(201);
    }
}
