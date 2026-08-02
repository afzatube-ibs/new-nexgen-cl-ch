<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Resources;

use App\Domains\Platform\IdentityAccess\Audit\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AuditLog
 */
final class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'actorId' => $this->actor_id,
            'action' => $this->action,
            'targetType' => $this->target_type,
            'targetId' => $this->target_id,
            'before' => $this->before,
            'after' => $this->after,
            'correlationId' => $this->correlation_id,
            // Never null: the audit_logs migration sets useCurrent() and
            // no code path in this module creates an AuditLog any other
            // way (see AuditLogger, the only writer) — an actual nullsafe
            // here would silently mask that invariant ever being broken.
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
