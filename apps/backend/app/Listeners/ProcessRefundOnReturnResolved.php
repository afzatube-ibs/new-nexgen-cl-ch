<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Payments\Actions\RefundPaymentAction;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Operations\Returns\Actions\MarkRefundFailedAction;
use App\Domains\Operations\Returns\Actions\StartRefundProcessingAction;
use App\Domains\Operations\Returns\Events\ReturnResolved;
use App\Domains\Operations\Returns\Models\RefundRequest;
use Throwable;

/**
 * The platform's second cross-domain event-routing seam (the first being
 * CreateShipmentOnOrderPlaced) — lives outside every domain's own
 * namespace for the identical reason: this class necessarily references
 * both Returns' (Operations) event/models and Payments' (Commerce) own
 * Action, which deptrac.yaml's layer separation forbids either domain's
 * own code from doing directly, per ARCH:CROSS_DOMAIN_COMMUNICATION.
 *
 * Only acts when `$event->resolution === 'refund'` — an exchange or
 * reject resolution carries no `refundRequestId` and this listener is a
 * no-op for those, exactly as Returns' own Actions\
 * ResolveReturnRequestAction never creates a RefundRequest for them.
 *
 * The try/catch here is a mechanical error boundary, not a business
 * decision (see this project's own "if this class ever needs an if
 * statement deciding whether to create a shipment, that decision belongs
 * in [the owning module's] own Action" standard, applied here to
 * refunding): on failure, this listener delegates the actual outcome-
 * recording to Returns' own Actions\MarkRefundFailedAction, never
 * deciding anything itself beyond "this attempt did not succeed."
 * Necessary because Payments' RefundPaymentAction may throw (unsupported
 * gateway, amount validation, the gateway's own API failing) and this
 * runs inside a synchronous, in-process event-bus publish() call (per
 * DomainEventBus's own docblock, "the publishing module's own transaction
 * has already committed by the time this is called") — letting the
 * exception propagate uncaught would surface as an unrelated 500 on
 * whatever HTTP request happened to trigger Actions\
 * ResolveReturnRequestAction, with the real failure never recorded
 * anywhere a caller could see it.
 */
final readonly class ProcessRefundOnReturnResolved
{
    public function __construct(
        private StartRefundProcessingAction $startRefundProcessingAction,
        private RefundPaymentAction $refundPaymentAction,
        private MarkRefundFailedAction $markRefundFailedAction,
    ) {}

    public function handle(ReturnResolved $event): void
    {
        if ($event->resolution !== 'refund' || $event->refundRequestId === null) {
            return;
        }

        $refundRequest = RefundRequest::query()->find($event->refundRequestId);

        if ($refundRequest === null) {
            return;
        }

        $refundRequest = $this->startRefundProcessingAction->execute($refundRequest);

        try {
            $payment = Payment::query()->findOrFail($refundRequest->payment_id);

            $this->refundPaymentAction->execute(
                payment: $payment,
                amount: $refundRequest->amount,
                reason: 'Return '.$event->returnRequestId,
                actorId: null,
            );
        } catch (Throwable $e) {
            $this->markRefundFailedAction->execute($refundRequest, $e->getMessage());
        }
    }
}
