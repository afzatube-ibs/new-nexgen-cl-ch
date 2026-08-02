<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Console\Commands;

use App\Domains\Platform\Foundation\Health\HealthCheckService;
use Illuminate\Console\Command;

/**
 * `php artisan platform:health` — the CLI-native counterpart to
 * GET /api/health, used by docker-compose.yml's container healthchecks
 * (a CLI probe is simpler and more reliable from inside a php-fpm-only or
 * worker container than an HTTP round-trip through nginx).
 *
 * --liveness runs no dependency checks at all: it exits 0 the moment
 * artisan itself has booted, matching what a container orchestrator means
 * by "is this process alive." Without the flag, it runs the full
 * HealthCheckService (the same checks GET /api/health runs) and exits
 * non-zero if anything is unhealthy — for manual operator diagnostics, per
 * DEPLOYMENT:OPERATIONAL_READINESS.
 */
final class PlatformHealthCommand extends Command
{
    protected $signature = 'platform:health {--liveness : Skip dependency checks; exit 0 once the process has booted.}';

    protected $description = 'Report Platform Foundation health (readiness) or process liveness.';

    public function handle(HealthCheckService $healthCheckService): int
    {
        if ($this->option('liveness')) {
            $this->info('alive');

            return self::SUCCESS;
        }

        $report = $healthCheckService->run();

        foreach ($report['checks'] as $check) {
            $line = sprintf('[%s] %s — %s (%.2fms)', $check['status'], $check['name'], $check['message'], $check['latencyMs']);
            $check['status'] === 'healthy' ? $this->info($line) : $this->error($line);
        }

        if (! $report['healthy']) {
            $this->error('Platform Foundation is unhealthy.');

            return self::FAILURE;
        }

        $this->info('Platform Foundation is healthy.');

        return self::SUCCESS;
    }
}
