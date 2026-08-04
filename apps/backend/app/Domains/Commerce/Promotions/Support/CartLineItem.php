<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Support;

/**
 * One line of a cart, exactly as much as this module needs to evaluate
 * "Category promotions", "Product promotions", and "Buy X Get Y" against
 * it. `productId`/`categoryIds` reference Catalog by identifier only, per
 * ARCH:CROSS_DOMAIN_COMMUNICATION — this module never imports a Catalog
 * class to validate them. `unitPrice` is a numeric string already resolved
 * by the caller (Pricing's own public contract) — "Use Pricing instead of
 * duplicating pricing logic" is satisfied by this module never looking up
 * or recalculating a base price itself, only ever adjusting the price it
 * is given, mirroring how Orders "records the outcome of pricing and
 * promotion decisions" per docs/04_MODULE_ARCHITECTURE.md.
 */
final readonly class CartLineItem
{
    /**
     * @param  list<string>  $categoryIds
     */
    public function __construct(
        public string $productId,
        public array $categoryIds,
        public int $quantity,
        public string $unitPrice,
    ) {}
}
