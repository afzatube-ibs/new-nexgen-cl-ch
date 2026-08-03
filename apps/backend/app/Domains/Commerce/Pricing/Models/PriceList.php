<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Models;

use App\Domains\Commerce\Pricing\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\PriceListFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MODULE:PRICING's aggregate root for base pricing — see the price_lists
 * migration's docblock for the full rationale, including why "Price
 * Lists" and "Price Books" are implemented as this one concept.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $currency_code
 * @property bool $is_default
 * @property string $status
 * @property int $lock_version
 */
final class PriceList extends Model
{
    /** @use HasFactory<PriceListFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'name',
        'currency_code',
        'is_default',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $priceList): void {
            $priceList->tenant_id ??= TenantId::DEFAULT;
            $priceList->status ??= self::STATUS_ACTIVE;
            $priceList->is_default ??= false;
            $priceList->currency_code = strtoupper((string) $priceList->currency_code);
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $priceList->lock_version
            // immediately after creation would otherwise see null instead
            // of 1.
            $priceList->lock_version ??= 1;
        });

        self::saving(function (self $priceList): void {
            if ($priceList->isDirty('currency_code')) {
                $priceList->currency_code = strtoupper((string) $priceList->currency_code);
            }
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return PriceListFactory
     */
    protected static function newFactory(): Factory
    {
        return PriceListFactory::new();
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * @return HasMany<PriceListEntry, $this>
     */
    public function entries(): HasMany
    {
        return $this->hasMany(PriceListEntry::class);
    }
}
