<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use App\Domains\Platform\IdentityAccess\Models\Concerns\HasOptimisticLocking;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * The staff/operator account MODULE:IDENTITY_ACCESS owns — never a customer
 * account (the future, distinct Customers module owns those).
 *
 * `status` implements DATA:LIFECYCLE's Active/Archived states at the
 * business level (soft-deletes below implement Deleted). `lock_version`
 * implements DATA:VERSIONING (see Concerns\HasOptimisticLocking).
 * `tenant_id` implements ARCH:DATA_OWNERSHIP's designed-in, unexercised
 * tenant boundary — defaults to Platform Foundation's single-installation
 * constant.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $email
 * @property string $password
 * @property string $status
 * @property int $lock_version
 */
final class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    /**
     * Laravel's default factory-name resolution mirrors a model's full
     * namespace under Database\Factories (e.g. it would look for
     * Database\Factories\Domains\Platform\IdentityAccess\Models\UserFactory),
     * which does not exist — this project keeps every factory directly
     * under database/factories/, matching Laravel's own top-level
     * convention rather than replicating the domain folder structure a
     * second time for no benefit.
     *
     * @return UserFactory
     */
    protected static function newFactory(): Factory
    {
        return UserFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $user): void {
            $user->tenant_id ??= TenantId::DEFAULT;
            $user->status ??= self::STATUS_ACTIVE;
            // The migration's column default (1) applies at the database
            // level but is never reflected on the in-memory model Eloquent
            // returns from create() unless set here too — a caller reading
            // $user->lock_version immediately after creation would
            // otherwise see null instead of 1, corrupting the very first
            // DATA:VERSIONING expected_version it could ever send back.
            $user->lock_version ??= 1;
        });
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function hasPermission(string $permissionKey): bool
    {
        return $this->roles()
            ->whereHas('permissions', fn ($query) => $query->where('key', $permissionKey))
            ->exists();
    }
}
