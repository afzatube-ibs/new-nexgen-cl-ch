<?php

declare(strict_types=1);

namespace App\Domains\Platform\Installer\Models;

use Database\Factories\InstallationFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * See the platform_installations migration's docblock — this module's one
 * piece of owned data, a write-once completion marker and lock. Immutable,
 * like Audit\AuditLog elsewhere in the platform: no `updated_at`, no
 * update/delete code path anywhere in this module.
 *
 * @property string $id
 * @property int $slot
 * @property string $installed_by
 * @property Carbon $created_at
 */
final class Installation extends Model
{
    /** @use HasFactory<InstallationFactory> */
    use HasFactory, HasUuids;

    protected $table = 'platform_installations';

    public const UPDATED_AT = null;

    protected $fillable = [
        'installed_by',
    ];

    protected static function booted(): void
    {
        self::creating(function (self $installation): void {
            $installation->slot = 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return InstallationFactory
     */
    protected static function newFactory(): Factory
    {
        return InstallationFactory::new();
    }
}
