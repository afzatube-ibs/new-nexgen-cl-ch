<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Exceptions;

use RuntimeException;

/**
 * Surfaced when Actions\SubmitCheckoutAction's final, authoritative stock
 * check (immediately before reserving) finds a SKU no longer available in
 * the quantity requested — time has passed since Actions\
 * ReviewCheckoutAction's own check, and stock is a genuinely concurrent
 * resource. Mirrors Inventory's own InsufficientStockException's HTTP
 * treatment: mapped to 409 in bootstrap/app.php — a conflict with the
 * current, real state of a shared resource, not a validation failure of
 * the request itself.
 */
final class CheckoutItemUnavailableException extends RuntimeException
{
    public function __construct(string $sku, int $requested, int $available)
    {
        parent::__construct("SKU [{$sku}] has only {$available} unit(s) available, but {$requested} were requested.");
    }
}
