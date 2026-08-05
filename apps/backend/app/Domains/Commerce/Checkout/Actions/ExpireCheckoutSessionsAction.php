<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Events\CheckoutAbandoned;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * The sweep behind this module's Acceptance Criterion: "a checkout
 * session is genuinely Temporary per DATA:LIFECYCLE — abandoned sessions
 * do not accumulate indefinitely." Run by Console\Commands\
 * ExpireCheckoutSessionsCommand, intended to be scheduled (per Laravel's
 * own scheduler, wired by the operator per this platform's self-hosted
 * deployment model).
 *
 * Every session is expired inside its OWN single-aggregate transaction —
 * this method's own loop is never wrapped in one outer transaction, since
 * that would make a single sweep's transaction span every stale session
 * (many distinct aggregate instances) at once, which DATA:TRANSACTION_
 * BOUNDARIES forbids just as much for many instances of one aggregate
 * type as for two different aggregate types.
 */
final readonly class ExpireCheckoutSessionsAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(): int
    {
        $sessions = CheckoutSession::query()
            ->whereIn('status', [CheckoutSession::STATUS_OPEN, CheckoutSession::STATUS_REVIEWED])
            ->where('expires_at', '<', now())
            ->get();

        foreach ($sessions as $session) {
            DB::transaction(function () use ($session) {
                $session->status = CheckoutSession::STATUS_EXPIRED;
                $session->save();

                $this->auditLogger->log(
                    action: 'checkout.expired',
                    actorId: null,
                    targetType: CheckoutSession::class,
                    targetId: $session->id,
                    after: ['status' => $session->status],
                );

                $this->eventBus->publish(new CheckoutAbandoned(
                    sessionId: $session->id,
                    customerId: $session->customer_id,
                    guestEmail: $session->guest_email,
                ));
            });
        }

        return $sessions->count();
    }
}
