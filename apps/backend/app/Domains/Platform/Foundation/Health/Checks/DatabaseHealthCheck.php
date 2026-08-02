<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Health\Checks;

use App\Domains\Platform\Foundation\Health\Contracts\HealthCheck;
use App\Domains\Platform\Foundation\Health\HealthCheckResult;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Confirms the primary datastore (ADR-0003: MySQL 8+) is reachable and
 * actually answering queries, not merely that a connection object exists.
 */
final readonly class DatabaseHealthCheck implements HealthCheck
{
    public function name(): string
    {
        return 'database';
    }

    public function check(): HealthCheckResult
    {
        $start = microtime(true);

        try {
            DB::connection()->select('select 1');

            return HealthCheckResult::healthy(
                $this->name(),
                'Database connection is reachable.',
                (microtime(true) - $start) * 1000,
            );
        } catch (Throwable $e) {
            Log::error('Database health check failed', [
                'exception' => $e->getMessage(),
                'exception_class' => $e::class,
            ]);

            return HealthCheckResult::unhealthy(
                $this->name(),
                'Database is unreachable.',
                (microtime(true) - $start) * 1000,
            );
        }
    }
}
