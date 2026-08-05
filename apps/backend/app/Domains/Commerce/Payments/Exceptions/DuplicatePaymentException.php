<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Exceptions;

use RuntimeException;

/**
 * "Duplicate Payment Protection" — thrown by Actions\InitiatePaymentAction
 * when the Order named already has another Payment sitting in a
 * non-terminal (pending/authorized) status. An Order may accumulate many
 * Payment rows over its lifetime (a failed attempt followed by a
 * successful one on a different gateway), but never more than one
 * concurrently active — see the payments migration's docblock. Mapped to
 * HTTP 409 in bootstrap/app.php: this is a conflict with the current,
 * real state of the Order's payment, not a validation failure.
 */
final class DuplicatePaymentException extends RuntimeException
{
    public function __construct(string $orderId, string $existingPaymentId)
    {
        parent::__construct(
            "Order [{$orderId}] already has an active payment [{$existingPaymentId}] in progress.",
        );
    }
}
