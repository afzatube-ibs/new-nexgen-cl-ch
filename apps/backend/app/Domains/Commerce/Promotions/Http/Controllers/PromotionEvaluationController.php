<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Controllers;

use App\Domains\Commerce\Promotions\Actions\EvaluatePromotionsAction;
use App\Domains\Commerce\Promotions\Http\Requests\EvaluatePromotionsRequest;
use App\Domains\Commerce\Promotions\Http\Resources\PromotionEvaluationResource;
use App\Domains\Commerce\Promotions\Support\CartContext;
use App\Domains\Commerce\Promotions\Support\CartLineItem;

/**
 * MODULE:PROMOTIONS' "discount calculation at checkout time" Public
 * Contract as its own dedicated endpoint — per planning/IMPLEMENTATION_
 * MASTER_PLAN.md's Promotions & Coupons entry. Gated by
 * `promotions.promotions.view` (read-only — nothing here mutates state);
 * a future Checkout module will call Actions\EvaluatePromotionsAction
 * directly rather than through this permission-gated HTTP endpoint,
 * mirroring Pricing's TaxCalculationController precedent exactly.
 */
final class PromotionEvaluationController
{
    public function __construct(private readonly EvaluatePromotionsAction $evaluatePromotionsAction) {}

    public function __invoke(EvaluatePromotionsRequest $request): PromotionEvaluationResource
    {
        /** @var array<int, array{product_id: string, category_ids?: array<int, string>, quantity: int, unit_price: string}> $items */
        $items = $request->validated('items');

        $lineItems = array_map(
            fn (array $item) => new CartLineItem(
                productId: $item['product_id'],
                categoryIds: array_values($item['category_ids'] ?? []),
                quantity: (int) $item['quantity'],
                unitPrice: (string) $item['unit_price'],
            ),
            $items,
        );

        $cart = new CartContext(
            items: array_values($lineItems),
            subtotal: (string) $request->validated('subtotal'),
            currencyCode: (string) $request->validated('currency_code'),
            customerId: $request->validated('customer_id'),
            storeId: $request->validated('store_id'),
            couponCode: $request->validated('coupon_code'),
        );

        return new PromotionEvaluationResource($this->evaluatePromotionsAction->execute($cart));
    }
}
