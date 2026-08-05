<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Controllers;

use App\Domains\Commerce\Checkout\Actions\SelectShippingOptionAction;
use App\Domains\Commerce\Checkout\Http\Requests\SelectShippingOptionRequest;
use App\Domains\Commerce\Checkout\Http\Resources\CheckoutSessionResource;
use App\Domains\Commerce\Checkout\Http\Resources\ShippingOptionResource;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Checkout\Support\ShippingOptionCatalog;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ShippingOptionController
{
    public function __construct(private readonly SelectShippingOptionAction $selectShippingOptionAction) {}

    /**
     * "Shipping selection integration" starts with knowing what is
     * selectable — lists Support\ShippingOptionCatalog's own catalog.
     */
    public function index(): AnonymousResourceCollection
    {
        return ShippingOptionResource::collection(ShippingOptionCatalog::all());
    }

    public function update(SelectShippingOptionRequest $request, CheckoutSession $session): CheckoutSessionResource
    {
        $updated = $this->selectShippingOptionAction->execute(
            session: $session,
            shippingOptionId: $request->string('shipping_option_id')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CheckoutSessionResource($updated);
    }
}
