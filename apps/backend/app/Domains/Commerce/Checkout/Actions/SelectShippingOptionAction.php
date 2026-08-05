<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutValidationException;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Checkout\Support\ShippingOptionCatalog;
use Illuminate\Support\Facades\DB;

final readonly class SelectShippingOptionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(CheckoutSession $session, string $shippingOptionId, int $expectedVersion, ?string $actorId): CheckoutSession
    {
        return DB::transaction(function () use ($session, $shippingOptionId, $expectedVersion, $actorId) {
            $session->assertVersionMatches($expectedVersion);
            $session->assertMutable();

            $option = ShippingOptionCatalog::find($shippingOptionId);

            if ($option === null) {
                throw new CheckoutValidationException(
                    $session->id,
                    'shipping_option_unknown',
                    "Shipping option [{$shippingOptionId}] does not exist.",
                );
            }

            $before = $session->only(['shipping_option_id', 'shipping_total']);
            $session->shipping_option_id = $option->id;
            $session->shipping_total = $option->amount;
            $session->resetReviewIfNeeded();
            $session->touchExpiry();
            $session->save();

            $this->auditLogger->log(
                action: 'checkout.shipping_option_selected',
                actorId: $actorId,
                targetType: CheckoutSession::class,
                targetId: $session->id,
                before: $before,
                after: $session->only(['shipping_option_id', 'shipping_total']),
            );

            return $session;
        });
    }
}
