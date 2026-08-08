<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Audit;

use Illuminate\Support\Facades\Context;

/**
 * The single place Search writes audit records, per DATA:AUDIT_DATA —
 * every index maintenance operation (a manual reindex trigger) is
 * audited, mirroring every other module's own AuditLogger exactly. See
 * the search_audit_logs migration's own docblock for why individual
 * search queries are deliberately not logged here.
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
