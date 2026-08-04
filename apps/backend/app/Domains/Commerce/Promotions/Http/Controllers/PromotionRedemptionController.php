<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Controllers;

use App\Domains\Commerce\Promotions\Actions\RedeemPromotionAction;
use App\Domains\Commerce\Promotions\Http\Requests\RedeemPromotionRequest;
use App\Domains\Commerce\Promotions\Http\Resources\PromotionRedemptionResource;
use App\Domains\Commerce\Promotions\Models\PromotionRedemption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class PromotionRedemptionController
{
    public function __construct(private readonly RedeemPromotionAction $redeemPromotionAction) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = PromotionRedemption::query()->orderByDesc('redeemed_at');

        if ($request->filled('promotion_id')) {
            $query->where('promotion_id', $request->string('promotion_id')->toString());
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->string('customer_id')->toString());
        }

        return PromotionRedemptionResource::collection($query->paginate(perPage: (int) $request->integer('per_page', 25)));
    }

    public function store(RedeemPromotionRequest $request): JsonResponse
    {
        $redemption = $this->redeemPromotionAction->execute(
            promotionId: $request->string('promotion_id')->toString(),
            couponCode: $request->input('coupon_code'),
            customerId: $request->input('customer_id'),
            orderReference: $request->input('order_reference'),
            discountAmount: (string) $request->input('discount_amount'),
            currencyCode: $request->string('currency_code')->toString(),
            actorId: $request->user()?->id,
        );

        return (new PromotionRedemptionResource($redemption))->response()->setStatusCode(201);
    }
}
