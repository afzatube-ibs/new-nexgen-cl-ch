<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Audit;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * DATA:AUDIT_DATA / SECURITY:AUDIT_LOGGING's record for this module. See
 * the media_audit_logs migration's docblock. Written only through
 * AuditLogger.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string|null $actor_id
 * @property string $action
 * @property string|null $target_type
 * @property string|null $target_id
 * @property array<string, mixed>|null $before
 * @property array<string, mixed>|null $after
 * @property string|null $correlation_id
 */
final class AuditLog extends Model
{
    use HasUuids;

    protected $table = 'media_audit_logs';

    public const UPDATED_AT = null;

    protected $fillable = [
        'actor_id',
        'action',
        'target_type',
        'target_id',
        'before',
        'after',
        'correlation_id',
    ];

    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $log): void {
            $log->tenant_id ??= TenantId::DEFAULT;
        });
    }
}
