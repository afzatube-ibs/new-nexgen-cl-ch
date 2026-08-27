<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Audit;

use Illuminate\Support\Facades\Context;

/**
 * The single place Appearance writes audit records — mirrors
 * `StoreConfiguration\Audit\AuditLogger` exactly, including the ambient
 * correlation-id stamping (API:CORRELATION).
 */
final readonly class AuditLogger
{
    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function log(
        string $action,
        ?string $actorId,
        ?string $targetType = null,
        ?string $targetId = null,
        ?array $before = null,
        ?array $after = null,
    ): AuditLog {
        return AuditLog::query()->create([
            'actor_id' => $actorId,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'before' => $before,
            'after' => $after,
            'correlation_id' => $this->ambientCorrelationId(),
        ]);
    }

    private function ambientCorrelationId(): ?string
    {
        $value = Context::get('correlation_id');

        return is_string($value) ? $value : null;
    }
}
