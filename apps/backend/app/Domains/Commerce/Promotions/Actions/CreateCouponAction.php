<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Coupon;
use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Support\Facades\DB;

final readonly class CreateCouponAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(Promotion $promotion, array $attributes, ?string $actorId): Coupon
    {
        return DB::transaction(function () use ($promotion, $attributes, $actorId) {
            $coupon = $promotion->coupons()->create([
                'code' => $attributes['code'],
                'usage_limit_global' => $attributes['usage_limit_global'] ?? null,
            ]);

            $this->auditLogger->log(
                action: 'coupon.created',
                actorId: $actorId,
                targetType: Coupon::class,
                targetId: $coupon->id,
                after: $coupon->only(['promotion_id', 'code', 'usage_limit_global', 'status']),
            );

            return $coupon;
        });
    }
}
