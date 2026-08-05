<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Support\Facades\DB;

final readonly class RemoveCouponAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(CheckoutSession $session, int $expectedVersion, ?string $actorId): CheckoutSession
    {
        return DB::transaction(function () use ($session, $expectedVersion, $actorId) {
            $session->assertVersionMatches($expectedVersion);
            $session->assertMutable();

            $before = $session->only(['coupon_code']);
            $session->coupon_code = null;
            $session->resetReviewIfNeeded();
            $session->touchExpiry();
            $session->save();

            $this->auditLogger->log(
                action: 'checkout.coupon_removed',
                actorId: $actorId,
                targetType: CheckoutSession::class,
                targetId: $session->id,
                before: $before,
            );

            return $session;
        });
    }
}
