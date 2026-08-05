<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutValidationException;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Pricing\Actions\CalculateTaxAction;
use App\Domains\Commerce\Pricing\Actions\LookupPriceAction;
use App\Domains\Commerce\Promotions\Actions\EvaluatePromotionsAction;
use App\Domains\Commerce\Promotions\Support\CartContext;
use App\Domains\Commerce\Promotions\Support\CartLineItem;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * "Checkout review": recomputes a session's full price/tax/discount/
 * shipping breakdown from scratch and transitions it to `reviewed` — the
 * one place this module calls Pricing's LookupPriceAction/
 * CalculateTaxAction and Promotions' EvaluatePromotionsAction, all
 * read-only (nothing in either module is mutated by a review — see
 * Actions\SubmitCheckoutAction for the mutating counterpart that redeems
 * what a review only evaluated). This keeps the whole operation a
 * single-aggregate write (CheckoutSession and its own CheckoutItem
 * children), even though it reads across four other modules, per DATA:
 * TRANSACTION_BOUNDARIES — reading another aggregate is unrestricted;
 * only writing more than one aggregate in one transaction is not.
 *
 * "Cart validation", "Inventory validation" is deliberately NOT performed
 * here (only at submission, via Actions\SubmitCheckoutAction) — a review
 * is a pure calculation that must be safely repeatable as many times as
 * the cart changes, and reserving stock is not a repeatable, side-effect
 * -free operation; checking availability without reserving would still
 * be stale by the time of submission regardless, so this action does not
 * pretend to guarantee availability, only price/discount/tax accuracy at
 * this moment. "Pricing validation", "Promotion validation", and "Address
 * validation" ARE enforced here: every line must resolve a real price, an
 * applied coupon code must evaluate to an eligible promotion, and both
 * addresses plus a shipping option must already be set.
 */
final readonly class ReviewCheckoutAction
{
    private const int SCALE = 4;

    public function __construct(
        private LookupPriceAction $lookupPriceAction,
        private CalculateTaxAction $calculateTaxAction,
        private EvaluatePromotionsAction $evaluatePromotionsAction,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(CheckoutSession $session, int $expectedVersion, ?string $actorId): CheckoutSession
    {
        return DB::transaction(function () use ($session, $expectedVersion, $actorId) {
            $session->assertVersionMatches($expectedVersion);
            $session->assertMutable();

            $items = $session->items()->get();

            if ($items->isEmpty()) {
                throw new CheckoutValidationException($session->id, 'cart_empty', "Checkout session [{$session->id}] has no items.");
            }

            if ($session->billing_address === null || $session->shipping_address === null) {
                throw new CheckoutValidationException($session->id, 'address_missing', "Checkout session [{$session->id}] is missing a billing or shipping address.");
            }

            if ($session->shipping_option_id === null || $session->shipping_total === null) {
                throw new CheckoutValidationException($session->id, 'shipping_option_missing', "Checkout session [{$session->id}] has no shipping option selected.");
            }

            $shippingAddress = $session->shipping_address;
            $countryCode = (string) ($shippingAddress['country_code'] ?? '');
            $region = (string) ($shippingAddress['region'] ?? '');

            $subtotal = '0.0000';
            $taxTotal = '0.0000';
            $cartLineItems = [];

            foreach ($items as $item) {
                $priceEntry = $this->lookupPriceAction->execute($item->sku, $session->currency_code);

                if ($priceEntry === null) {
                    throw new CheckoutValidationException(
                        $session->id,
                        'price_unavailable',
                        "No price is available for SKU [{$item->sku}] in [{$session->currency_code}].",
                    );
                }

                $unitPrice = $this->numeric($priceEntry->effectivePrice());
                $lineSubtotal = bcmul($unitPrice, (string) $item->quantity, self::SCALE);
                $subtotal = bcadd($subtotal, $lineSubtotal, self::SCALE);

                $taxAmount = '0.0000';

                if ($item->tax_class_id !== null) {
                    $taxResult = $this->calculateTaxAction->execute($item->tax_class_id, $countryCode, $region, $lineSubtotal);
                    $taxAmount = $this->numeric($taxResult->taxAmount);
                }

                $taxTotal = bcadd($taxTotal, $taxAmount, self::SCALE);

                $item->unit_price = $unitPrice;
                $item->tax_amount = $taxAmount;
                $item->save();

                $cartLineItems[] = new CartLineItem(
                    productId: $item->product_id,
                    categoryIds: $item->category_ids ?? [],
                    quantity: $item->quantity,
                    unitPrice: $unitPrice,
                );
            }

            $cartContext = new CartContext(
                items: $cartLineItems,
                subtotal: $subtotal,
                currencyCode: $session->currency_code,
                customerId: $session->customer_id,
                storeId: null,
                couponCode: $session->coupon_code,
            );

            $evaluation = $this->evaluatePromotionsAction->execute($cartContext);

            if ($session->coupon_code !== null) {
                $couponMatched = false;

                foreach ($evaluation->appliedPromotions as $applied) {
                    if ($applied->couponId !== null) {
                        $couponMatched = true;
                        break;
                    }
                }

                if (! $couponMatched) {
                    throw new CheckoutValidationException(
                        $session->id,
                        'coupon_invalid',
                        "Coupon code [{$session->coupon_code}] is not currently valid.",
                    );
                }
            }

            $discountTotal = $this->numeric($evaluation->totalDiscount);
            $shippingTotal = $evaluation->freeShipping ? '0.0000' : $this->numeric((string) $session->shipping_total);

            $grandTotal = bcadd(
                bcsub(bcadd($subtotal, $taxTotal, self::SCALE), $discountTotal, self::SCALE),
                $shippingTotal,
                self::SCALE,
            );

            $session->subtotal = $subtotal;
            $session->discount_total = $discountTotal;
            $session->tax_total = $taxTotal;
            $session->shipping_total = $shippingTotal;
            $session->grand_total = $grandTotal;
            $session->status = CheckoutSession::STATUS_REVIEWED;
            $session->touchExpiry();
            $session->save();

            $this->auditLogger->log(
                action: 'checkout.reviewed',
                actorId: $actorId,
                targetType: CheckoutSession::class,
                targetId: $session->id,
                after: $session->only(['subtotal', 'discount_total', 'tax_total', 'shipping_total', 'grand_total', 'status']),
            );

            return $session;
        });
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
