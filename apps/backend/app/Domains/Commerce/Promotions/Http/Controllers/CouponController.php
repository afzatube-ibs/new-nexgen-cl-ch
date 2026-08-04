<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Controllers;

use App\Domains\Commerce\Promotions\Actions\ArchiveCouponAction;
use App\Domains\Commerce\Promotions\Actions\CreateCouponAction;
use App\Domains\Commerce\Promotions\Actions\DeleteCouponAction;
use App\Domains\Commerce\Promotions\Actions\UpdateCouponAction;
use App\Domains\Commerce\Promotions\Http\Requests\CreateCouponRequest;
use App\Domains\Commerce\Promotions\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Promotions\Http\Requests\UpdateCouponRequest;
use App\Domains\Commerce\Promotions\Http\Resources\CouponResource;
use App\Domains\Commerce\Promotions\Models\Coupon;
use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class CouponController
{
    public function __construct(
        private readonly CreateCouponAction $createCouponAction,
        private readonly UpdateCouponAction $updateCouponAction,
        private readonly ArchiveCouponAction $archiveCouponAction,
        private readonly DeleteCouponAction $deleteCouponAction,
    ) {}

    public function index(Request $request, Promotion $promotion): AnonymousResourceCollection
    {
        $query = $promotion->coupons();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return CouponResource::collection($query->orderBy('code')->paginate());
    }

    public function show(Promotion $promotion, Coupon $coupon): CouponResource
    {
        return new CouponResource($coupon);
    }

    public function store(CreateCouponRequest $request, Promotion $promotion): JsonResponse
    {
        $coupon = $this->createCouponAction->execute(
            promotion: $promotion,
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new CouponResource($coupon))->response()->setStatusCode(201);
    }

    public function update(UpdateCouponRequest $request, Promotion $promotion, Coupon $coupon): CouponResource
    {
        $updated = $this->updateCouponAction->execute(
            coupon: $coupon,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CouponResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, Promotion $promotion, Coupon $coupon): CouponResource
    {
        $archived = $this->archiveCouponAction->execute(
            coupon: $coupon,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CouponResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Promotion $promotion, Coupon $coupon): Response
    {
        $this->deleteCouponAction->execute(
            coupon: $coupon,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
