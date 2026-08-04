<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Models\Coupon;
use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use App\Domains\Commerce\Promotions\Models\PromotionRedemption;
use App\Domains\Commerce\Promotions\Support\AppliedPromotion;
use App\Domains\Commerce\Promotions\Support\CartContext;
use App\Domains\Commerce\Promotions\Support\CartLineItem;
use App\Domains\Commerce\Promotions\Support\PromotionEvaluationResult;
use InvalidArgumentException;

/**
 * MODULE:PROMOTIONS' "Validation engine" / "Promotion eligibility
 * evaluation" / "Discount calculation service" — the Public Contract the
 * future Checkout module calls to know what a cart's promotions are worth,
 * per this module's Public Contracts entry in the master plan. Read-only:
 * evaluating never mutates a Promotion, Coupon, or usage counter — see
 * Actions\RedeemPromotionAction for the mutating counterpart called once a
 * cart actually becomes an order.
 *
 * Stackable / non-stackable resolution with priority ordering: every
 * eligible stackable promotion applies together; among eligible
 * non-stackable promotions, only the single highest-`priority` one
 * applies — "non-stackable" is exclusive only with *other non-stackable*
 * promotions, never with stackable ones, the conventional interpretation
 * this module adopts in the absence of a more specific requirement.
 *
 * Condition evaluation: within one PromotionCondition::condition_type,
 * conditions are OR'd ("any of these products"); across different
 * condition_types on the same promotion, groups are AND'd ("this product
 * AND this customer"). A promotion with no conditions is cart-wide
 * eligible.
 *
 * Uses bcmath throughout for the same reason Pricing's CalculateTaxAction
 * does — this platform's monetary calculations are never native float
 * arithmetic.
 */
final readonly class EvaluatePromotionsAction
{
    private const int SCALE = 4;

    public function execute(CartContext $cart): PromotionEvaluationResult
    {
        $promotions = Promotion::query()
            ->where('status', Promotion::STATUS_ACTIVE)
            ->with('conditions')
            ->get();

        /** @var list<array{0: Promotion, 1: ?Coupon}> $candidates */
        $candidates = [];

        foreach ($promotions as $promotion) {
            if (! $promotion->isWithinSchedule()) {
                continue;
            }

            $coupon = null;

            if ($promotion->requires_coupon) {
                $coupon = $this->matchedCoupon($promotion, $cart);

                if ($coupon === null || $coupon->hasReachedGlobalUsageLimit()) {
                    continue;
                }
            } elseif ($promotion->hasReachedGlobalUsageLimit()) {
                continue;
            }

            if ($this->hasReachedPerCustomerLimit($promotion, $cart->customerId)) {
                continue;
            }

            if (! $this->conditionsSatisfied($promotion, $cart)) {
                continue;
            }

            $candidates[] = [$promotion, $coupon];
        }

        $stackable = array_values(array_filter($candidates, fn (array $pair) => $pair[0]->is_stackable));
        $nonStackable = array_values(array_filter($candidates, fn (array $pair) => ! $pair[0]->is_stackable));

        usort($nonStackable, fn (array $a, array $b) => $b[0]->priority <=> $a[0]->priority);

        $selected = $stackable;

        if ($nonStackable !== []) {
            $selected[] = $nonStackable[0];
        }

        $applied = [];
        $totalDiscount = '0.0000';
        $freeShipping = false;

        foreach ($selected as [$promotion, $coupon]) {
            $amount = $this->calculateDiscount($promotion, $cart);

            if ($promotion->discount_type === Promotion::TYPE_FREE_SHIPPING) {
                $freeShipping = true;
            }

            if (bccomp($amount, '0', self::SCALE) > 0 || $promotion->discount_type === Promotion::TYPE_FREE_SHIPPING) {
                $applied[] = new AppliedPromotion(
                    promotionId: $promotion->id,
                    name: $promotion->name,
                    discountType: $promotion->discount_type,
                    discountAmount: $amount,
                    couponId: $coupon?->id,
                );

                $totalDiscount = bcadd($totalDiscount, $amount, self::SCALE);
            }
        }

        return new PromotionEvaluationResult($applied, $totalDiscount, $freeShipping);
    }

    private function matchedCoupon(Promotion $promotion, CartContext $cart): ?Coupon
    {
        if ($cart->couponCode === null || $cart->couponCode === '') {
            return null;
        }

        return Coupon::query()
            ->where('promotion_id', $promotion->id)
            ->where('code', strtoupper($cart->couponCode))
            ->where('status', Coupon::STATUS_ACTIVE)
            ->first();
    }

    private function hasReachedPerCustomerLimit(Promotion $promotion, ?string $customerId): bool
    {
        if ($promotion->usage_limit_per_customer === null || $customerId === null) {
            return false;
        }

        $count = PromotionRedemption::query()
            ->where('promotion_id', $promotion->id)
            ->where('customer_id', $customerId)
            ->count();

        return $count >= $promotion->usage_limit_per_customer;
    }

    private function conditionsSatisfied(Promotion $promotion, CartContext $cart): bool
    {
        $conditions = $promotion->conditions;

        if ($conditions->isEmpty()) {
            return true;
        }

        foreach ($conditions->groupBy('condition_type') as $group) {
            $matchesAny = $group->contains(fn (PromotionCondition $condition) => $this->conditionMatches($condition, $cart));

            if (! $matchesAny) {
                return false;
            }
        }

        return true;
    }

    private function conditionMatches(PromotionCondition $condition, CartContext $cart): bool
    {
        return match ($condition->condition_type) {
            PromotionCondition::TYPE_PRODUCT => collect($cart->items)->contains(
                fn (CartLineItem $item) => $item->productId === $condition->reference_id
            ),
            PromotionCondition::TYPE_CATEGORY => collect($cart->items)->contains(
                fn (CartLineItem $item) => in_array($condition->reference_id, $item->categoryIds, true)
            ),
            PromotionCondition::TYPE_CUSTOMER => $cart->customerId !== null && $cart->customerId === $condition->reference_id,
            PromotionCondition::TYPE_STORE => $cart->storeId !== null && $cart->storeId === $condition->reference_id,
            PromotionCondition::TYPE_MINIMUM_ORDER_AMOUNT => $condition->numeric_value !== null
                && bccomp($this->numeric($cart->subtotal), $this->numeric($condition->numeric_value), self::SCALE) >= 0,
            default => false,
        };
    }

    /**
     * @return numeric-string
     */
    private function calculateDiscount(Promotion $promotion, CartContext $cart): string
    {
        return match ($promotion->discount_type) {
            Promotion::TYPE_PERCENTAGE => $this->calculatePercentageDiscount($promotion, $cart),
            Promotion::TYPE_FIXED_AMOUNT => $this->calculateFixedAmountDiscount($promotion, $cart),
            Promotion::TYPE_BUY_X_GET_Y => $this->calculateBuyXGetYDiscount($promotion, $cart),
            default => '0.0000',
        };
    }

    /**
     * @return numeric-string
     */
    private function calculatePercentageDiscount(Promotion $promotion, CartContext $cart): string
    {
        if ($promotion->discount_value === null) {
            return '0.0000';
        }

        $base = $this->eligibleSubtotal($promotion, $cart);

        return bcdiv(bcmul($base, $this->numeric($promotion->discount_value), self::SCALE + 2), '100', self::SCALE);
    }

    /**
     * Never discounts more than the subtotal it applies to — a fixed
     * amount larger than the eligible subtotal is capped rather than
     * producing a negative line.
     *
     * @return numeric-string
     */
    private function calculateFixedAmountDiscount(Promotion $promotion, CartContext $cart): string
    {
        if ($promotion->discount_value === null) {
            return '0.0000';
        }

        $base = $this->eligibleSubtotal($promotion, $cart);
        $discountValue = $this->numeric($promotion->discount_value);

        return bccomp($discountValue, $base, self::SCALE) > 0 ? $base : $discountValue;
    }

    /**
     * The subtotal of cart items this promotion actually applies to: when
     * the promotion carries PRODUCT/CATEGORY conditions, only matching
     * line items count ("Category promotions" / "Product promotions"
     * scoping the discount itself, not merely eligibility); otherwise the
     * whole cart subtotal.
     *
     * @return numeric-string
     */
    private function eligibleSubtotal(Promotion $promotion, CartContext $cart): string
    {
        $scopingConditions = $promotion->conditions->filter(
            fn (PromotionCondition $condition) => in_array(
                $condition->condition_type,
                [PromotionCondition::TYPE_PRODUCT, PromotionCondition::TYPE_CATEGORY],
                true,
            )
        );

        if ($scopingConditions->isEmpty()) {
            return $this->numeric($cart->subtotal);
        }

        $sum = '0.0000';

        foreach ($cart->items as $item) {
            $matches = $scopingConditions->contains(fn (PromotionCondition $condition) => match ($condition->condition_type) {
                PromotionCondition::TYPE_PRODUCT => $condition->reference_id === $item->productId,
                PromotionCondition::TYPE_CATEGORY => in_array($condition->reference_id, $item->categoryIds, true),
                default => false,
            });

            if ($matches) {
                $sum = bcadd($sum, bcmul($this->numeric($item->unitPrice), (string) $item->quantity, self::SCALE), self::SCALE);
            }
        }

        return $sum;
    }

    /**
     * "Buy X Get Y": eligibility is met once the cart holds at least
     * `buy_x_quantity` units matching `buy_x_target_type`/`_id` (or any
     * item, when unset). The discounted units, up to `eligibleSets *
     * get_y_quantity`, are taken from `get_y_target_type`/`_id`-matching
     * line items, most-expensive-unit first (the customer-favorable
     * convention this module adopts). When the buy- and get- targets
     * overlap (the common "buy 3, get 1 of them free" shape), this
     * implementation does not exclude the discounted units from the
     * buy-quantity count — a cart with exactly `buy_x_quantity` matching
     * items already satisfies eligibility, with `get_y_quantity` of those
     * same items then discounted.
     *
     * @return numeric-string
     */
    private function calculateBuyXGetYDiscount(Promotion $promotion, CartContext $cart): string
    {
        if (
            $promotion->buy_x_quantity === null || $promotion->buy_x_quantity < 1
            || $promotion->get_y_quantity === null || $promotion->get_y_quantity < 1
            || $promotion->get_y_discount_percentage === null
        ) {
            return '0.0000';
        }

        $buyQuantityInCart = $this->matchingQuantity($promotion->buy_x_target_type, $promotion->buy_x_target_id, $cart);

        if ($buyQuantityInCart < $promotion->buy_x_quantity) {
            return '0.0000';
        }

        $eligibleSets = intdiv($buyQuantityInCart, $promotion->buy_x_quantity);
        $remainingUnits = $eligibleSets * $promotion->get_y_quantity;

        $getYDiscountPercentage = $this->numeric($promotion->get_y_discount_percentage);

        $getItems = $this->matchingLineItems($promotion->get_y_target_type, $promotion->get_y_target_id, $cart);
        usort($getItems, fn (CartLineItem $a, CartLineItem $b) => bccomp($this->numeric($b->unitPrice), $this->numeric($a->unitPrice), self::SCALE));

        $discount = '0.0000';

        foreach ($getItems as $item) {
            if ($remainingUnits <= 0) {
                break;
            }

            $unitsFromThisItem = min($remainingUnits, $item->quantity);
            $perUnitDiscount = bcdiv(bcmul($this->numeric($item->unitPrice), $getYDiscountPercentage, self::SCALE + 2), '100', self::SCALE);
            $discount = bcadd($discount, bcmul($perUnitDiscount, (string) $unitsFromThisItem, self::SCALE), self::SCALE);

            $remainingUnits -= $unitsFromThisItem;
        }

        return $discount;
    }

    private function matchingQuantity(?string $targetType, ?string $targetId, CartContext $cart): int
    {
        $total = 0;

        foreach ($cart->items as $item) {
            if ($this->itemMatchesTarget($item, $targetType, $targetId)) {
                $total += $item->quantity;
            }
        }

        return $total;
    }

    /**
     * @return list<CartLineItem>
     */
    private function matchingLineItems(?string $targetType, ?string $targetId, CartContext $cart): array
    {
        return array_values(array_filter(
            $cart->items,
            fn (CartLineItem $item) => $this->itemMatchesTarget($item, $targetType, $targetId),
        ));
    }

    private function itemMatchesTarget(CartLineItem $item, ?string $targetType, ?string $targetId): bool
    {
        if ($targetType === null || $targetId === null) {
            return true;
        }

        return match ($targetType) {
            Promotion::TARGET_PRODUCT => $item->productId === $targetId,
            Promotion::TARGET_CATEGORY => in_array($targetId, $item->categoryIds, true),
            default => false,
        };
    }

    /**
     * @return numeric-string
     */
    private function numeric(string $value): string
    {
        if (! is_numeric($value)) {
            throw new InvalidArgumentException("Expected a numeric string, got [{$value}].");
        }

        return $value;
    }
}
