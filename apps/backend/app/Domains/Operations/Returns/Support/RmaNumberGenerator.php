<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Support;

use App\Domains\Operations\Returns\Models\ReturnRequest;
use RuntimeException;

/**
 * Generates this module's own human-readable reference (Return
 * Merchandise Authorization) — a label, never used as identity per
 * DATA:ENTITY_IDENTITY. Retries on the rare collision rather than trusting
 * randomness alone, mirroring the same "generate, check, retry" shape
 * this project already uses wherever a human-readable-but-unique code is
 * needed.
 */
final readonly class RmaNumberGenerator
{
    private const int MAX_ATTEMPTS = 10;

    public function generate(): string
    {
        for ($attempt = 0; $attempt < self::MAX_ATTEMPTS; $attempt++) {
            $candidate = 'RMA-'.str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            if (! ReturnRequest::query()->where('rma_number', $candidate)->exists()) {
                return $candidate;
            }
        }

        // Astronomically unlikely given the six-digit space, but
        // PRINCIPLES:EXPLICIT_FAILURE requires a real failure here rather
        // than returning a non-unique value and letting the database's own
        // unique constraint surface as an opaque 500 later.
        throw new RuntimeException('Unable to generate a unique RMA number after '.self::MAX_ATTEMPTS.' attempts.');
    }
}
