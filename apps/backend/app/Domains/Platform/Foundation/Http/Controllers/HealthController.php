<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Http\Controllers;

use App\Domains\Platform\Foundation\Health\HealthCheckService;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/health — the platform's readiness surface, per ARCH:NFR's
 * observability principle and DEPLOYMENT:OPERATIONAL_READINESS /
 * DEPLOYMENT:MONITORING_READINESS.
 *
 * Deliberately outside API:VERSIONING's versioned business surface: this is
 * operational infrastructure (Platform Foundation's Master Plan entry
 * states "Public Contracts: None externally"), not a module public
 * business capability, so it is not published as part of a versioned
 * resource collection. Per API:STABILITY_LEVELS's requirement that such an
 * exception be stated explicitly rather than left for a caller to guess —
 * this docblock is that statement. An uptime monitor or orchestrator must
 * be able to depend on this path surviving a business API version bump.
 *
 * Laravel's own built-in `/up` liveness probe (bootstrap/app.php's
 * `health: '/up'`) is left untouched alongside this — it answers "is the
 * process alive at all," this endpoint answers "are this instance's actual
 * dependencies reachable," and the two are not redundant.
 */
final readonly class HealthController
{
    public function __construct(private HealthCheckService $healthCheckService) {}

    public function __invoke(): JsonResponse
    {
        $report = $this->healthCheckService->run();

        return new JsonResponse(
            data: [
                'data' => [
                    'status' => $report['healthy'] ? 'healthy' : 'unhealthy',
                    'checks' => $report['checks'],
                    'timestamp' => now()->toIso8601String(),
                ],
            ],
            status: $report['healthy'] ? 200 : 503,
        );
    }
}
