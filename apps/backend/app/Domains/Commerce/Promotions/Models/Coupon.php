<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Models;

use App\Domains\Commerce\Promotions\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\CouponFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * "Manual coupon codes" — see the coupons migration's docblock for why
 * this carries its own `lock_version` rather than being versioned through
 * its parent Promotion.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $promotion_id
 * @property string $code
 * @property int|null $usage_limit_global
 * @property int $usage_count_global
 * @property string $status
 * @property int $lock_version
 */
final class Coupon extends Model
{
    /** @use HasFactory<CouponFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'promotion_id',
        'code',
        'usage_limit_global',
        'status',
    ];

    protected static function booted(): void
    {
        self::creating(function (self $coupon): void {
            $coupon->tenant_id ??= TenantId::DEFAULT;
            $coupon->status ??= self::STATUS_ACTIVE;
            $coupon->code = strtoupper((string) $coupon->code);
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $coupon->lock_version immediately
            // after creation would otherwise see null instead of 1.
            $coupon->lock_version ??= 1;
        });

        self::saving(function (self $coupon): void {
            if ($coupon->isDirty('code')) {
                $coupon->code = strtoupper((string) $coupon->code);
            }
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return CouponFactory
     */
    protected static function newFactory(): Factory
    {
        return CouponFactory::new();
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function hasReachedGlobalUsageLimit(): bool
    {
        return $this->usage_limit_global !== null && $this->usage_count_global >= $this->usage_limit_global;
    }

    /**
     * @return BelongsTo<Promotion, $this>
     */
    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }
}
