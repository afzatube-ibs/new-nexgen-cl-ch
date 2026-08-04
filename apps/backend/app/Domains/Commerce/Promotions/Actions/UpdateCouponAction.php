<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Coupon;
use Illuminate\Support\Facades\DB;

final readonly class UpdateCouponAction
{
    private const array TRACKED_FIELDS = ['code', 'usage_limit_global', 'status'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Coupon $coupon, array $changes, int $expectedVersion, ?string $actorId): Coupon
    {
        return DB::transaction(function () use ($coupon, $changes, $expectedVersion, $actorId) {
            $coupon->assertVersionMatches($expectedVersion);

            $before = $coupon->only(self::TRACKED_FIELDS);
            $coupon->fill($changes)->save();

            $this->auditLogger->log(
                action: 'coupon.updated',
                actorId: $actorId,
                targetType: Coupon::class,
                targetId: $coupon->id,
                before: $before,
                after: $coupon->only(self::TRACKED_FIELDS),
            );

            return $coupon;
        });
    }
}
