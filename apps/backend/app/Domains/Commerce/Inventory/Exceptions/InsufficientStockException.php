<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Exceptions;

use RuntimeException;

/**
 * Raised when a reservation or adjustment would take a StockItem's
 * available quantity below zero — the concrete mechanism behind the
 * master plan's Inventory acceptance criterion "concurrent checkout
 * reservations never oversell." Mapped to HTTP 409 in bootstrap/app.php:
 * the request is well-formed, but current stock levels conflict with it.
 */
final class InsufficientStockException extends RuntimeException
{
    public function __construct(
        public readonly string $stockItemId,
        public readonly int $available,
        public readonly int $requested,
    ) {
        parent::__construct(
            "Stock item [{$stockItemId}] has only {$available} available, but {$requested} were requested."
        );
    }
}
