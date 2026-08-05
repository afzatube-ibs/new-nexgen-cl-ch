<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Models;

use App\Domains\Operations\Shipping\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ShippingMethodFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A named shipping service level a store offers — see the shipping_methods
 * migration's docblock, including why `provider_code` is a plain string
 * rather than a foreign key.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $code
 * @property string $name
 * @property string|null $description
 * @property string|null $provider_code
 * @property string $status
 * @property int $lock_version
 */
final class ShippingMethod extends Model
{
    /** @use HasFactory<ShippingMethodFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'code',
        'name',
        'description',
        'provider_code',
        'status',
    ];

    protected static function booted(): void
    {
        self::creating(function (self $method): void {
            $method->tenant_id ??= TenantId::DEFAULT;
            $method->status ??= self::STATUS_ACTIVE;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $method->lock_version immediately
            // after creation would otherwise see null instead of 1.
            $method->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ShippingMethodFactory
     */
    protected static function newFactory(): Factory
    {
        return ShippingMethodFactory::new();
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isSelfFulfilled(): bool
    {
        return $this->provider_code === null;
    }
}
