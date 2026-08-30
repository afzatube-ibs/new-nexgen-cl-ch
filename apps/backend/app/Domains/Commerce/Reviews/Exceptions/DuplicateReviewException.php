<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Exceptions;

use RuntimeException;

/**
 * The real `unique(tenant_id, customer_id, product_id)` constraint this
 * module's own migration declares, surfaced as a clean, real error rather
 * than a raw database exception. Mapped to HTTP 409 in bootstrap/app.php —
 * a real conflict (this customer already has a review on this product),
 * not a validation failure of the submitted fields themselves.
 */
final class DuplicateReviewException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('You have already reviewed this product.');
    }
}
