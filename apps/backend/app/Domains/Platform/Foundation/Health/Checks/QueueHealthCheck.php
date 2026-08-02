<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Health\Checks;

use App\Domains\Platform\Foundation\Health\Contracts\HealthCheck;
use App\Domains\Platform\Foundation\Health\HealthCheckResult;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Confirms the queue backbone's underlying Redis connection (ADR-0004) is
 * reachable.
 *
 * This verifies connectivity only — it does NOT verify that a Background
 * Worker is actively consuming jobs, which this check has no way to
 * observe from inside the Application Unit. Overstating that would violate
 * PRINCIPLES:EXPLICIT_FAILURE by implying a guarantee this check cannot
 * make. Worker liveness is confirmed separately, by the worker process's
 * own `platform:health --liveness` container healthcheck.
 */
final readonly class QueueHealthCheck implements HealthCheck
{
    public function name(): string
    {
        return 'queue';
    }

    public function check(): HealthCheckResult
    {
        $start = microtime(true);

        try {
            $pong = Redis::connection('default')->ping();

            // predis returns a Predis\Response\Status object (stringifies
            // to "PONG"); phpredis returns true or the string "PONG"
            // directly. Compare by string form so the check is correct
            // under either client, since Laravel's Redis facade supports
            // both interchangeably (see composer.json's REDIS_CLIENT note).
            if ($pong !== true && (string) $pong !== 'PONG') {
                return HealthCheckResult::unhealthy(
                    $this->name(),
                    'Queue connection did not respond as expected.',
                    (microtime(true) - $start) * 1000,
                );
            }

            return HealthCheckResult::healthy(
                $this->name(),
                'Queue connection is reachable. (Verifies connectivity only, not active worker consumption.)',
                (microtime(true) - $start) * 1000,
            );
        } catch (Throwable $e) {
            Log::error('Queue health check failed', [
                'exception' => $e->getMessage(),
                'exception_class' => $e::class,
            ]);

            return HealthCheckResult::unhealthy(
                $this->name(),
                'Queue connection is unreachable.',
                (microtime(true) - $start) * 1000,
            );
        }
    }
}
