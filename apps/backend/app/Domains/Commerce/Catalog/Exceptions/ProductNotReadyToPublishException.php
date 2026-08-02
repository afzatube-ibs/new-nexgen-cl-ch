<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Exceptions;

use RuntimeException;

/**
 * The "Publishing workflow" requirement made concrete: a Product may not
 * transition to `active` until it meets a minimal completeness bar (see
 * Actions\PublishProductAction). Mapped to HTTP 422 in bootstrap/app.php —
 * a validation-shaped failure, not a conflict, since the request itself is
 * well-formed but the aggregate's current state does not satisfy the
 * business rule yet.
 */
final class ProductNotReadyToPublishException extends RuntimeException
{
    /**
     * @param  list<string>  $reasons
     */
    public function __construct(public readonly string $productId, public readonly array $reasons)
    {
        parent::__construct("Product [{$productId}] is not ready to publish: ".implode('; ', $reasons));
    }
}
