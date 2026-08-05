<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Support;

/**
 * One entry in Support\ShippingOptionCatalog — see that class's docblock.
 */
final readonly class ShippingOption
{
    public function __construct(
        public string $id,
        public string $label,
        public string $amount,
    ) {}
}
