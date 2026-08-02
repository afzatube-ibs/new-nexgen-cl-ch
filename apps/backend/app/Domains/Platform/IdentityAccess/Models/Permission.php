<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A specific operation a module exposes through its public contract
 * (SECURITY:ROLES_PERMISSIONS). Rows in this table exist only because
 * Authorization\PermissionRegistry declared them and Console\Commands\
 * SyncPermissionsCommand synced them — see permissions migration's
 * docblock for why this is never an admin-CRUD resource.
 *
 * @property string $id
 * @property string $key
 * @property string $label
 * @property string $module
 */
final class Permission extends Model
{
    use HasUuids;

    protected $fillable = ['key', 'label', 'module'];

    /**
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }
}
