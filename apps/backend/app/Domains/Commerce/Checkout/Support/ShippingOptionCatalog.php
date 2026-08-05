<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Support;

/**
 * "Shipping selection integration" — but there is no Shipping & Logistics
 * module yet to integrate with (per docs/04_MODULE_ARCHITECTURE.md's
 * Evolvable module list, it is a distinct future module this platform has
 * not built). Rather than fake an integration with a module that does not
 * exist, or invent a full rate-calculation engine that would belong to
 * that future module and not to Checkout, this is this module's own
 * small, honest, fully-functional set of flat-rate options — genuinely
 * usable now, and the exact seam a future Shipping & Logistics module
 * replaces without changing Models\CheckoutSession's shape
 * (`shipping_option_id`/`shipping_total`) or this module's own contract:
 * that module would supply its own catalog through the same lookup shape
 * this class already exposes.
 *
 * Not database-backed: this is Temporary-classification, Checkout-owned
 * configuration, not a business record another module or an operator
 * needs to manage — mirrors why Promotions' Support\CartContext and
 * similar plain-PHP shapes elsewhere in this project are never persisted
 * for their own sake.
 */
final class ShippingOptionCatalog
{
    /**
     * @return list<ShippingOption>
     */
    public static function all(): array
    {
        return [
            new ShippingOption(id: 'standard', label: 'Standard Shipping (5-7 business days)', amount: '5.0000'),
            new ShippingOption(id: 'express', label: 'Express Shipping (2-3 business days)', amount: '15.0000'),
            new ShippingOption(id: 'overnight', label: 'Overnight Shipping (1 business day)', amount: '30.0000'),
        ];
    }

    public static function find(string $id): ?ShippingOption
    {
        foreach (self::all() as $option) {
            if ($option->id === $id) {
                return $option;
            }
        }

        return null;
    }
}
