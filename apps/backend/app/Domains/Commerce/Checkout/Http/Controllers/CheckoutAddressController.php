<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Controllers;

use App\Domains\Commerce\Checkout\Actions\SetCheckoutAddressAction;
use App\Domains\Commerce\Checkout\Http\Requests\SetCheckoutAddressRequest;
use App\Domains\Commerce\Checkout\Http\Resources\CheckoutSessionResource;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;

final class CheckoutAddressController
{
    public function __construct(private readonly SetCheckoutAddressAction $setCheckoutAddressAction) {}

    public function updateBilling(SetCheckoutAddressRequest $request, CheckoutSession $session): CheckoutSessionResource
    {
        return $this->update($request, $session, SetCheckoutAddressAction::TYPE_BILLING);
    }

    public function updateShipping(SetCheckoutAddressRequest $request, CheckoutSession $session): CheckoutSessionResource
    {
        return $this->update($request, $session, SetCheckoutAddressAction::TYPE_SHIPPING);
    }

    private function update(SetCheckoutAddressRequest $request, CheckoutSession $session, string $type): CheckoutSessionResource
    {
        $updated = $this->setCheckoutAddressAction->execute(
            session: $session,
            type: $type,
            input: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CheckoutSessionResource($updated);
    }
}
