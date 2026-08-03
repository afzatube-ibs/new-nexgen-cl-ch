<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Models;

use App\Domains\Commerce\Pricing\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\TaxClassFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A tax classification a product belongs to (e.g. "Standard", "Reduced",
 * "Zero-Rated", "Exempt") — see the tax_classes migration's docblock.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $status
 * @property int $lock_version
 */
final class TaxClass extends Model
{
    /** @use HasFactory<TaxClassFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'name',
        'status',
    ];

    protected static function booted(): void
    {
        self::creating(function (self $class): void {
            $class->tenant_id ??= TenantId::DEFAULT;
            $class->status ??= self::STATUS_ACTIVE;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $class->lock_version immediately
            // after creation would otherwise see null instead of 1.
            $class->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return TaxClassFactory
     */
    protected static function newFactory(): Factory
    {
        return TaxClassFactory::new();
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
