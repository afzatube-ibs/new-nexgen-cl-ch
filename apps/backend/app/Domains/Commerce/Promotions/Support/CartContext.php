<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Support;

/**
 * The input to Actions\EvaluatePromotionsAction — the whole of what this
 * module needs to know about an in-progress cart in order to evaluate
 * promotion eligibility and calculate a discount, without depending on
 * Checkout or Orders at all (a plain DTO the future Checkout module
 * constructs and passes in, per this module's Public Contracts entry in
 * the master plan). `customerId` and `storeId` reference Customers and
 * Store Configuration by identifier only, per ARCH:CROSS_DOMAIN_
 * COMMUNICATION.
 */
final readonly class CartContext
{
    /**
     * @param  list<CartLineItem>  $items
     */
    public function __construct(
        public array $items,
        public string $subtotal,
        public string $currencyCode,
        public ?string $customerId = null,
        public ?string $storeId = null,
        public ?string $couponCode = null,
    ) {}
}
