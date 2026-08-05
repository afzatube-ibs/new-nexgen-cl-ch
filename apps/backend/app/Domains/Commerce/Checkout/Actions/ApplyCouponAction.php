<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Support\Facades\DB;

/**
 * Records a coupon code on the session. Deliberately does not itself
 * validate the code against Promotions — that would duplicate the
 * eligibility logic Actions\ReviewCheckoutAction already runs via
 * Promotions' own Actions\EvaluatePromotionsAction, the single place this
 * module ever asks "is this code good," per this module's "do not
 * duplicate" requirement. Applying a code simply means "evaluate this
 * code the next time this session is reviewed."
 */
final readonly class ApplyCouponAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(CheckoutSession $session, string $couponCode, int $expectedVersion, ?string $actorId): CheckoutSession
    {
        return DB::transaction(function () use ($session, $couponCode, $expectedVersion, $actorId) {
            $session->assertVersionMatches($expectedVersion);
            $session->assertMutable();

            $before = $session->only(['coupon_code']);
            $session->coupon_code = strtoupper($couponCode);
            $session->resetReviewIfNeeded();
            $session->touchExpiry();
            $session->save();

            $this->auditLogger->log(
                action: 'checkout.coupon_applied',
                actorId: $actorId,
                targetType: CheckoutSession::class,
                targetId: $session->id,
                before: $before,
                after: $session->only(['coupon_code']),
            );

            return $session;
        });
    }
}
