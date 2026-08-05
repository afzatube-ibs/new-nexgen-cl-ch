<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Controllers;

use App\Domains\Commerce\Checkout\Actions\ReviewCheckoutAction;
use App\Domains\Commerce\Checkout\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Checkout\Http\Resources\CheckoutSessionResource;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;

final class CheckoutReviewController
{
    public function __construct(private readonly ReviewCheckoutAction $reviewCheckoutAction) {}

    public function __invoke(ExpectedVersionRequest $request, CheckoutSession $session): CheckoutSessionResource
    {
        $reviewed = $this->reviewCheckoutAction->execute(
            session: $session,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CheckoutSessionResource($reviewed->load('items'));
    }
}
