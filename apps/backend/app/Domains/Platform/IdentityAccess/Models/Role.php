<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use App\Domains\Platform\IdentityAccess\Models\Concerns\HasOptimisticLocking;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A named, reusable bundle of permissions (SECURITY:ROLES_PERMISSIONS).
 * The aggregate root for "which permissions does this role currently
 * grant" — DATA:AGGREGATE_BOUNDARIES requires that fact be immediately
 * consistent, so permission composition is only ever changed through this
 * model, never by writing to permission_role directly from elsewhere.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $label
 * @property int $lock_version
 */
final class Role extends Model
{
    use HasOptimisticLocking, HasUuids, SoftDeletes;

    protected $fillable = ['name', 'label'];

    protected static function booted(): void
    {
        self::creating(function (self $role): void {
            $role->tenant_id ??= TenantId::DEFAULT;
            // See User::booted()'s identical line for why this is set here
            // rather than relying on the migration's database-level default.
            $role->lock_version ??= 1;
        });
    }

    /**
     * @return BelongsToMany<Permission, $this>
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }
}
