<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutValidationException;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Support\Facades\DB;

/**
 * See Http\Requests\SelectShippingOptionRequest's own docblock for why this
 * stores a caller-resolved quote rather than resolving one itself: this
 * action has no way to reach Operations\Shipping in-process, and the real
 * resolution already happened once, correctly, in Shipping's own module —
 * repeating it here would be exactly the "duplicate shipping logic" this
 * platform's own architecture forbids.
 */
final readonly class SelectShippingOptionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(
        CheckoutSession $session,
        string $shippingMethodId,
        string $shippingLabel,
        string $shippingAmount,
        string $currencyCode,
        int $expectedVersion,
        ?string $actorId,
    ): CheckoutSession {
        return DB::transaction(function () use ($session, $shippingMethodId, $shippingLabel, $shippingAmount, $currencyCode, $expectedVersion, $actorId) {
            $session->assertVersionMatches($expectedVersion);
            $session->assertMutable();

            $currencyCode = strtoupper($currencyCode);

            if ($currencyCode !== $session->currency_code) {
                throw new CheckoutValidationException(
                    $session->id,
                    'shipping_currency_mismatch',
                    "Shipping quote currency [{$currencyCode}] does not match this session's currency [{$session->currency_code}].",
                );
            }

            $before = $session->only(['shipping_option_id', 'shipping_option_label', 'shipping_total']);
            $session->shipping_option_id = $shippingMethodId;
            $session->shipping_option_label = $shippingLabel;
            $session->shipping_total = $shippingAmount;
            $session->resetReviewIfNeeded();
            $session->touchExpiry();
            $session->save();

            $this->auditLogger->log(
                action: 'checkout.shipping_option_selected',
                actorId: $actorId,
                targetType: CheckoutSession::class,
                targetId: $session->id,
                before: $before,
                after: $session->only(['shipping_option_id', 'shipping_option_label', 'shipping_total']),
            );

            return $session;
        });
    }
}
