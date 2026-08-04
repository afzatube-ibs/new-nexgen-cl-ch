<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes a Promotion — DATA:LIFECYCLE's Deleted state. Also
 * soft-deletes every condition and coupon it holds: the whole aggregate
 * moves to Deleted together, mirroring Customers' Customer+address-book
 * and Pricing's PriceList+entries precedent exactly. Redemption history
 * (`promotion_redemptions`) is left untouched — it is an immutable
 * historical fact, not part of the live aggregate, and remains queryable
 * for reporting after the promotion itself is gone.
 */
final readonly class DeletePromotionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Promotion $promotion, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($promotion, $expectedVersion, $actorId) {
            $promotion->assertVersionMatches($expectedVersion);

            $before = $promotion->only(['name', 'discount_type']);
            $promotion->conditions()->delete();
            $promotion->coupons()->delete();
            $promotion->delete();

            $this->auditLogger->log(
                action: 'promotion.deleted',
                actorId: $actorId,
                targetType: Promotion::class,
                targetId: $promotion->id,
                before: $before,
            );
        });
    }
}
