<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Exceptions;

use RuntimeException;

/**
 * Thrown by Engines\SearchEngineFactory (unknown engine code) or
 * Engines\SearchEngineResolver (known but unavailable engine) — mirrors
 * Notifications' own Exceptions\UnsupportedNotificationProviderException
 * exactly. There is no user-facing input that can trigger this today
 * (the engine is chosen once, from config/search.php, not per-request),
 * so unlike its Notifications counterpart this is not mapped to an HTTP
 * response in bootstrap/app.php — a misconfigured deployment surfaces
 * this as a genuine 500, per PRINCIPLES:EXPLICIT_FAILURE.
 */
final class UnsupportedSearchEngineException extends RuntimeException
{
    public function __construct(string $code)
    {
        parent::__construct("Unsupported or unavailable search engine: {$code}");
    }
}
