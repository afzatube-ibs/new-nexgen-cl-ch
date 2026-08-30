<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\PromotionRedemptionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * An immutable, append-only redemption record — see the
 * promotion_redemptions migration's docblock. Never updated after
 * creation; no `updated_at` semantics are relied upon anywhere in this
 * module.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $promotion_id
 * @property string|null $coupon_id
 * @property string|null $customer_id
 * @property string|null $order_reference
 * @property string $discount_amount
 * @property string $currency_code
 * @property Carbon $redeemed_at
 */
final class PromotionRedemption extends Model
{
    /** @use HasFactory<PromotionRedemptionFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'promotion_id',
        'coupon_id',
        'customer_id',
        'order_reference',
        'discount_amount',
        'currency_code',
        'redeemed_at',
    ];

    protected function casts(): array
    {
        return [
            // Matches the migration's own `decimal('discount_amount', 14,
            // 4)` — without this, SQLite's NUMERIC affinity returns a
            // whole-number amount as a PHP int (not a decimal string), the
            // same recurring bug class already found and fixed on several
            // other money-shaped columns this engagement.
            'discount_amount' => 'decimal:4',
            'redeemed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $redemption): void {
            $redemption->tenant_id ??= TenantId::DEFAULT;
            $redemption->redeemed_at ??= now();
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return PromotionRedemptionFactory
     */
    protected static function newFactory(): Factory
    {
        return PromotionRedemptionFactory::new();
    }

    /**
     * @return BelongsTo<Promotion, $this>
     */
    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    /**
     * @return BelongsTo<Coupon, $this>
     */
    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }
}
