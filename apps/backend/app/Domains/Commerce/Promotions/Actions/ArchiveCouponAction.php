<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Coupon;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveCouponAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Coupon $coupon, int $expectedVersion, ?string $actorId): Coupon
    {
        return DB::transaction(function () use ($coupon, $expectedVersion, $actorId) {
            $coupon->assertVersionMatches($expectedVersion);

            $previousStatus = $coupon->status;
            $coupon->status = Coupon::STATUS_ARCHIVED;
            $coupon->save();

            $this->auditLogger->log(
                action: 'coupon.archived',
                actorId: $actorId,
                targetType: Coupon::class,
                targetId: $coupon->id,
                before: ['status' => $previousStatus],
                after: ['status' => $coupon->status],
            );

            return $coupon;
        });
    }
}
