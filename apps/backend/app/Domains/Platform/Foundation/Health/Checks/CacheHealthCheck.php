<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Health\Checks;

use App\Domains\Platform\Foundation\Health\Contracts\HealthCheck;
use App\Domains\Platform\Foundation\Health\HealthCheckResult;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Confirms the externalized cache store (ADR-0004: Redis) is reachable with
 * a real write-then-read roundtrip — a connection that accepts a TCP
 * handshake but rejects commands would pass a bare ping and still fail
 * every request, so this check exercises the actual operation the
 * Application Unit depends on.
 */
final readonly class CacheHealthCheck implements HealthCheck
{
    public function name(): string
    {
        return 'cache';
    }

    public function check(): HealthCheckResult
    {
        $start = microtime(true);
        $key = 'health-check:'.Str::random(12);
        $value = Str::random(8);

        try {
            Cache::put($key, $value, now()->addSeconds(10));
            $roundTripped = Cache::get($key) === $value;
            Cache::forget($key);

            if (! $roundTripped) {
                return HealthCheckResult::unhealthy(
                    $this->name(),
                    'Cache roundtrip returned an unexpected value.',
                    (microtime(true) - $start) * 1000,
                );
            }

            return HealthCheckResult::healthy(
                $this->name(),
                'Cache roundtrip succeeded.',
                (microtime(true) - $start) * 1000,
            );
        } catch (Throwable $e) {
            Log::error('Cache health check failed', [
                'exception' => $e->getMessage(),
                'exception_class' => $e::class,
            ]);

            return HealthCheckResult::unhealthy(
                $this->name(),
                'Cache is unreachable.',
                (microtime(true) - $start) * 1000,
            );
        }
    }
}
