<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Resources;

use App\Domains\Commerce\Orders\Audit\AuditLog;
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
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
