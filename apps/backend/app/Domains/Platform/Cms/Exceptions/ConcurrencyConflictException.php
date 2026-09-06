<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * DATA:VERSIONING made concrete for MODULE:CMS. CMS keeps its own
 * exception type, matching every other versioned module's public boundary,
 * while rendering the platform-wide API:ERROR_MODEL 409 conflict envelope.
 */
final class ConcurrencyConflictException extends RuntimeException
{
    public function __construct(
        public readonly string $aggregateType,
        public readonly string $aggregateId,
        public readonly int $expectedVersion,
        public readonly int $actualVersion,
    ) {
        parent::__construct(sprintf(
            '%s [%s] has changed since it was last read: expected version %d, found %d.',
            $aggregateType,
            $aggregateId,
            $expectedVersion,
            $actualVersion,
        ));
    }

    /** Keep the module self-contained while preserving API:ERROR_MODEL. */
    public function render(): JsonResponse
    {
        return response()->json([
            'error' => [
                'type' => 'conflict',
                'message' => $this->getMessage(),
            ],
        ], 409);
    }
}
