<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Controllers;

use App\Domains\Commerce\Checkout\Actions\SelectShippingOptionAction;
use App\Domains\Commerce\Checkout\Http\Requests\SelectShippingOptionRequest;
use App\Domains\Commerce\Checkout\Http\Resources\CheckoutSessionResource;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;

/**
 * Real shipping-option *listing* now lives entirely on Operations\Shipping's
 * own public contract (`POST shipping/quote-options`), composed by the
 * Gateway — see Http\Requests\SelectShippingOptionRequest's docblock for
 * why Checkout itself cannot answer "what are my options" in-process. This
 * controller now only ever *records* a selection already resolved
 * elsewhere.
 */
final class ShippingOptionController
{
    public function __construct(private readonly SelectShippingOptionAction $selectShippingOptionAction) {}

    public function update(SelectShippingOptionRequest $request, CheckoutSession $session): CheckoutSessionResource
    {
        $updated = $this->selectShippingOptionAction->execute(
            session: $session,
            shippingMethodId: $request->string('shipping_method_id')->toString(),
            shippingLabel: $request->string('shipping_label')->toString(),
            shippingAmount: (string) $request->input('shipping_amount'),
            currencyCode: $request->string('currency_code')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CheckoutSessionResource($updated);
    }
}
