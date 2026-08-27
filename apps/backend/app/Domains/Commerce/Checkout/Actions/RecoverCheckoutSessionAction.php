<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Events\CheckoutStarted;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutValidationException;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * "Checkout recovery" — opens a brand-new, fully-live CheckoutSession
 * pre-populated with an expired one's cart, addresses, and shipping
 * selection, rather than requiring a customer to rebuild an abandoned
 * cart by hand. Writes only the new session (and its own new
 * CheckoutItem children) — the expired session it copies from is read
 * only, never mutated, so this remains a single-aggregate write per
 * DATA:TRANSACTION_BOUNDARIES even though it reads a second instance of
 * the same aggregate type.
 */
final readonly class RecoverCheckoutSessionAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(CheckoutSession $expiredSession, ?string $actorId): CheckoutSession
    {
        return DB::transaction(function () use ($expiredSession, $actorId) {
            // Time-based, not status-based: a session whose expires_at has
            // passed is recoverable immediately, without waiting on the
            // periodic checkout:expire-sessions sweep to have caught up and
            // flipped its status to STATUS_EXPIRED. This mirrors how
            // assertMutable() and the submission saga's claim() step both
            // define "expired" throughout this module — the sweep only
            // exists to reclaim stale rows and fire CheckoutAbandoned, not
            // to gate recovery eligibility.
            if (! $expiredSession->isExpired()) {
                throw new CheckoutValidationException(
                    $expiredSession->id,
                    'not_expired',
                    "Checkout session [{$expiredSession->id}] is not expired; nothing to recover.",
                );
            }

            $newSession = CheckoutSession::query()->create([
                'customer_id' => $expiredSession->customer_id,
                'guest_email' => $expiredSession->guest_email,
                'guest_name' => $expiredSession->guest_name,
                'currency_code' => $expiredSession->currency_code,
                'billing_address' => $expiredSession->billing_address,
                'shipping_address' => $expiredSession->shipping_address,
                'shipping_option_id' => $expiredSession->shipping_option_id,
                'shipping_option_label' => $expiredSession->shipping_option_label,
                'shipping_total' => $expiredSession->shipping_total,
            ]);

            foreach ($expiredSession->items as $item) {
                $newSession->items()->create([
                    'product_id' => $item->product_id,
                    'sku' => $item->sku,
                    'product_name' => $item->product_name,
                    'category_ids' => $item->category_ids,
                    'quantity' => $item->quantity,
                    'tax_class_id' => $item->tax_class_id,
                ]);
            }

            $this->auditLogger->log(
                action: 'checkout.recovered',
                actorId: $actorId,
                targetType: CheckoutSession::class,
                targetId: $newSession->id,
                before: ['recovered_from_session_id' => $expiredSession->id],
                after: $newSession->only(['customer_id', 'guest_email', 'currency_code']),
            );

            $this->eventBus->publish(new CheckoutStarted(
                sessionId: $newSession->id,
                customerId: $newSession->customer_id,
                currencyCode: $newSession->currency_code,
            ));

            return $newSession->load('items');
        });
    }
}
