<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Coupon;
use Illuminate\Support\Facades\DB;

final readonly class DeleteCouponAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Coupon $coupon, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($coupon, $expectedVersion, $actorId) {
            $coupon->assertVersionMatches($expectedVersion);

            $before = $coupon->only(['promotion_id', 'code']);
            $coupon->delete();

            $this->auditLogger->log(
                action: 'coupon.deleted',
                actorId: $actorId,
                targetType: Coupon::class,
                targetId: $coupon->id,
                before: $before,
            );
        });
    }
}
