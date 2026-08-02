<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Exceptions;

use RuntimeException;

/**
 * Raised when a ProductVariant would violate this module's variant
 * invariants: added to a non-`configurable` Product, built from
 * OptionValues the Product has not declared as one of its variant
 * dimensions (see product_options), or duplicating another variant's
 * exact OptionValue combination. Mapped to HTTP 422 in bootstrap/app.php.
 */
final class InvalidVariantException extends RuntimeException {}
