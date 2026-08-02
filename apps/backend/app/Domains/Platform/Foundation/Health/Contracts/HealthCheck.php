<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Health\Contracts;

use App\Domains\Platform\Foundation\Health\HealthCheckResult;

/**
 * A single dependency or subsystem the platform's operational health
 * depends on, per ARCH:NFR's observability principle and DEPLOYMENT:
 * OPERATIONAL_READINESS / DEPLOYMENT:MONITORING_READINESS.
 *
 * A HealthCheck must never throw — HealthCheckService treats an uncaught
 * exception from a check as that check's own failure, but a well-behaved
 * check catches its own dependency's exceptions and reports them as an
 * unhealthy HealthCheckResult, preserving detail in its own log entry
 * rather than in the value returned here.
 */
interface HealthCheck
{
    /**
     * A short, stable identifier for this check (e.g. "database"), used as
     * the key in the aggregated health report — part of the health
     * endpoint's response shape, so it must not change casually once
     * anything depends on it.
     */
    public function name(): string;

    public function check(): HealthCheckResult;
}
