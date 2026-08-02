<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Health;

/**
 * The outcome of a single HealthCheck. The public $message is deliberately
 * generic — per SECURITY:DATA_PROTECTION, an operational endpoint reachable
 * before authentication must never leak connection strings, hostnames, or
 * raw exception detail; that detail is logged server-side by the check
 * itself, never returned in this value object.
 */
final readonly class HealthCheckResult
{
    /**
     * @param  array<string, scalar>  $meta
     */
    private function __construct(
        public string $name,
        public bool $healthy,
        public string $message,
        public float $latencyMs,
        public array $meta = [],
    ) {}

    /**
     * @param  array<string, scalar>  $meta
     */
    public static function healthy(string $name, string $message, float $latencyMs, array $meta = []): self
    {
        return new self($name, true, $message, $latencyMs, $meta);
    }

    /**
     * @param  array<string, scalar>  $meta
     */
    public static function unhealthy(string $name, string $message, float $latencyMs, array $meta = []): self
    {
        return new self($name, false, $message, $latencyMs, $meta);
    }

    /**
     * @return array{name: string, status: string, message: string, latencyMs: float, meta: array<string, scalar>}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'status' => $this->healthy ? 'healthy' : 'unhealthy',
            'message' => $this->message,
            'latencyMs' => $this->latencyMs,
            'meta' => $this->meta,
        ];
    }
}
