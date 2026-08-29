<?php

namespace App\Providers;

use App\Domains\Commerce\Checkout\Events\CheckoutAbandoned;
use App\Domains\Commerce\Customers\Events\CustomerRegistered;
use App\Domains\Commerce\Orders\Events\OrderPlaced;
use App\Domains\Commerce\Orders\Events\OrderStatusChanged;
use App\Domains\Commerce\Payments\Events\PaymentCaptured;
use App\Domains\Commerce\Payments\Events\PaymentFailed;
use App\Domains\Commerce\Payments\Events\PaymentRefunded;
use App\Domains\Operations\Fulfillment\Events\FulfillmentCompleted;
use App\Domains\Operations\Fulfillment\Events\ShipmentDispatched;
use App\Domains\Operations\Returns\Events\RefundIssued;
use App\Domains\Operations\Returns\Events\ReturnRequested;
use App\Domains\Operations\Returns\Events\ReturnResolved;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Listeners\CompleteRefundOnPaymentRefunded;
use App\Listeners\CreateShipmentOnOrderPlaced;
use App\Listeners\ProcessRefundOnReturnResolved;
use App\Listeners\SendAbandonedCartReminderOnCheckoutAbandoned;
use App\Listeners\SendDeliveryConfirmationOnFulfillmentCompleted;
use App\Listeners\SendOrderCancellationNoticeOnOrderStatusChanged;
use App\Listeners\SendOrderConfirmationOnOrderPlaced;
use App\Listeners\SendPaymentFailureNoticeOnPaymentFailed;
use App\Listeners\SendPaymentReceiptOnPaymentCaptured;
use App\Listeners\SendRefundConfirmationOnPaymentRefunded;
use App\Listeners\SendRefundIssuedOnRefundIssued;
use App\Listeners\SendReturnReceivedOnReturnRequested;
use App\Listeners\SendShipmentNoticeOnShipmentDispatched;
use App\Listeners\SendWelcomeEmailOnCustomerRegistered;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * This is the platform's cross-domain event-routing composition root —
     * see App\Listeners\CreateShipmentOnOrderPlaced's own docblock for why
     * that subscription (the first real, production cross-domain listener
     * this platform has ever wired — ARCHITECTURE_REVIEW.md A-4 anticipated
     * exactly this) is registered here rather than inside either Orders or
     * Fulfillment's own ServiceProvider. Every subscription below follows
     * the identical pattern. The eleven Send*On*.php subscriptions are
     * Notifications' own event-consumption surface (`MODULE:NOTIFICATIONS`
     * "MUST subscribe to domain events") — see App\Listeners\
     * SendOrderConfirmationOnOrderPlaced's own docblock for the shared
     * rationale every one of them follows.
     */
    public function boot(): void
    {
        $bus = $this->app->make(DomainEventBus::class);

        $bus->subscribe(
            OrderPlaced::class,
            [CreateShipmentOnOrderPlaced::class, 'handle'],
        );

        $bus->subscribe(
            ReturnResolved::class,
            [ProcessRefundOnReturnResolved::class, 'handle'],
        );

        $bus->subscribe(
            PaymentRefunded::class,
            [CompleteRefundOnPaymentRefunded::class, 'handle'],
        );

        $bus->subscribe(
            OrderPlaced::class,
            [SendOrderConfirmationOnOrderPlaced::class, 'handle'],
        );

        $bus->subscribe(
            PaymentCaptured::class,
            [SendPaymentReceiptOnPaymentCaptured::class, 'handle'],
        );

        $bus->subscribe(
            PaymentRefunded::class,
            [SendRefundConfirmationOnPaymentRefunded::class, 'handle'],
        );

        $bus->subscribe(
            ShipmentDispatched::class,
            [SendShipmentNoticeOnShipmentDispatched::class, 'handle'],
        );

        $bus->subscribe(
            FulfillmentCompleted::class,
            [SendDeliveryConfirmationOnFulfillmentCompleted::class, 'handle'],
        );

        $bus->subscribe(
            ReturnRequested::class,
            [SendReturnReceivedOnReturnRequested::class, 'handle'],
        );

        $bus->subscribe(
            RefundIssued::class,
            [SendRefundIssuedOnRefundIssued::class, 'handle'],
        );

        $bus->subscribe(
            CustomerRegistered::class,
            [SendWelcomeEmailOnCustomerRegistered::class, 'handle'],
        );

        // Production Completion Plan v2, Milestone 3 — closes the three
        // confirmed gaps: PaymentFailed and CheckoutAbandoned were
        // previously published with no subscriber at all, and no listener
        // reacted to an order's transition to cancelled (the backend
        // cancellation capability itself — CancelOrderAction — was already
        // real; only its own customer notification was missing).
        $bus->subscribe(
            PaymentFailed::class,
            [SendPaymentFailureNoticeOnPaymentFailed::class, 'handle'],
        );

        $bus->subscribe(
            CheckoutAbandoned::class,
            [SendAbandonedCartReminderOnCheckoutAbandoned::class, 'handle'],
        );

        $bus->subscribe(
            OrderStatusChanged::class,
            [SendOrderCancellationNoticeOnOrderStatusChanged::class, 'handle'],
        );
    }
}
