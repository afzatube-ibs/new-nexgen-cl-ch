<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Controllers;

use App\Domains\Commerce\Checkout\Actions\ApplyCouponAction;
use App\Domains\Commerce\Checkout\Actions\RemoveCouponAction;
use App\Domains\Commerce\Checkout\Http\Requests\ApplyCouponRequest;
use App\Domains\Commerce\Checkout\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Checkout\Http\Resources\CheckoutSessionResource;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;

final class CheckoutCouponController
{
    public function __construct(
        private readonly ApplyCouponAction $applyCouponAction,
        private readonly RemoveCouponAction $removeCouponAction,
    ) {}

    public function store(ApplyCouponRequest $request, CheckoutSession $session): CheckoutSessionResource
    {
        $updated = $this->applyCouponAction->execute(
            session: $session,
            couponCode: $request->string('coupon_code')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CheckoutSessionResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, CheckoutSession $session): CheckoutSessionResource
    {
        $updated = $this->removeCouponAction->execute(
            session: $session,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CheckoutSessionResource($updated);
    }
}
