<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Health;

use App\Domains\Platform\Foundation\Health\Contracts\HealthCheck;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Aggregates every registered HealthCheck into one platform-wide readiness
 * report. Per ENGINEERING:RESILIENCE's failure-isolation requirement, one
 * check's failure — even an unexpected exception a check failed to catch
 * itself — never prevents the others from running or being reported.
 */
final readonly class HealthCheckService
{
    /**
     * @param  iterable<HealthCheck>  $checks
     */
    public function __construct(private iterable $checks) {}

    /**
     * @return array{healthy: bool, checks: array<int, array{name: string, status: string, message: string, latencyMs: float, meta: array<string, scalar>}>}
     */
    public function run(): array
    {
        $results = [];
        $allHealthy = true;

        foreach ($this->checks as $check) {
            $result = $this->runOne($check);
            $results[] = $result->toArray();
            $allHealthy = $allHealthy && $result->healthy;
        }

        return [
            'healthy' => $allHealthy,
            'checks' => $results,
        ];
    }

    private function runOne(HealthCheck $check): HealthCheckResult
    {
        $start = microtime(true);

        try {
            return $check->check();
        } catch (Throwable $e) {
            // A check that throws instead of catching its own dependency's
            // failure has a bug, but per PRINCIPLES:EXPLICIT_FAILURE that
            // must still surface as "unhealthy," never as a 500 that takes
            // the whole health report down with it. Full detail is logged
            // here, server-side only — never in the value returned to a
            // caller, per SECURITY:DATA_PROTECTION.
            Log::error('Health check threw an unhandled exception', [
                'check' => $check->name(),
                'exception' => $e->getMessage(),
                'exception_class' => $e::class,
            ]);

            return HealthCheckResult::unhealthy(
                $check->name(),
                'Check failed unexpectedly.',
                (microtime(true) - $start) * 1000,
            );
        }
    }
}
