<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Audit;

use Illuminate\Support\Facades\Context;

/**
 * The single place Customers writes audit records, per DATA:AUDIT_DATA and
 * this module's own Security Considerations entry in planning/
 * IMPLEMENTATION_MASTER_PLAN.md ("Full SECURITY:DATA_PROTECTION for
 * Sensitive classification"). Reads are logged here too (see
 * Http\Controllers\CustomerController's index/show), not only mutations,
 * mirroring Identity & Access's own precedent for its equally-Sensitive
 * user data.
 *
 * Every call is stamped with the ambient correlation id (see Platform
 * Foundation's AssignCorrelationId middleware) so an audit trail can be
 * joined back to the request/log lines that produced it, per API:
 * CORRELATION.
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
