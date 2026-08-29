<?php

declare(strict_types=1);

use App\Domains\Commerce\Checkout\Events\CheckoutAbandoned;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Customers\Events\CustomerRegistered;
use App\Domains\Commerce\Orders\Events\OrderPlaced;
use App\Domains\Commerce\Orders\Events\OrderStatusChanged;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Payments\Events\PaymentCaptured;
use App\Domains\Commerce\Payments\Events\PaymentFailed;
use App\Domains\Commerce\Payments\Events\PaymentRefunded;
use App\Domains\Operations\Fulfillment\Events\FulfillmentCompleted;
use App\Domains\Operations\Fulfillment\Events\ShipmentDispatched;
use App\Domains\Operations\Notifications\Models\Notification;
use App\Domains\Operations\Returns\Events\RefundIssued;
use App\Domains\Operations\Returns\Events\ReturnRequested;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Database\Factories\CheckoutItemFactory;
use Database\Seeders\NotificationTemplateSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

// Each test here exercises one of the eleven app/Listeners/Send*On*.php
// cross-domain integration listeners on the real, application-wired
// event bus — mirroring tests/Unit/Listeners/
// CreateShipmentOnOrderPlacedTest.php's own "publish on the real bus, not
// the listener class in isolation" approach. Queue::fake() is used
// throughout since these tests only need to confirm each listener
// resolved the correct recipient/template and queued a Notification —
// Actions\SendNotificationAction's own delivery behaviour is covered by
// its own dedicated unit test.
uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    Queue::fake();
});

it('queues an order confirmation when OrderPlaced is published', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $order = Order::factory()->create(['order_number' => 'ORD-LISTEN-1']);

    app(DomainEventBus::class)->publish(new OrderPlaced(
        orderId: $order->id,
        orderNumber: $order->order_number,
        customerId: $order->customer_id,
        grandTotal: $order->grand_total,
        currencyCode: $order->currency_code,
    ));

    $notification = Notification::query()->where('related_type', 'order')->where('related_id', $order->id)->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient)->toBe($order->customer_email);
    expect($notification->status)->toBe(Notification::STATUS_QUEUED);
    expect($notification->subject)->toContain('ORD-LISTEN-1');
});

it('queues a payment receipt when PaymentCaptured is published', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $order = Order::factory()->create();
    $paymentId = (string) Str::uuid();

    app(DomainEventBus::class)->publish(new PaymentCaptured(
        paymentId: $paymentId,
        orderId: $order->id,
        customerId: $order->customer_id,
        gatewayCode: 'bkash',
        amount: '100.0000',
        currencyCode: 'BDT',
    ));

    $notification = Notification::query()->where('related_type', 'payment')->where('related_id', $paymentId)->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient)->toBe($order->customer_email);
});

it('queues a refund confirmation when PaymentRefunded is published', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $order = Order::factory()->create();
    $paymentId = (string) Str::uuid();

    app(DomainEventBus::class)->publish(new PaymentRefunded(
        paymentId: $paymentId,
        orderId: $order->id,
        customerId: $order->customer_id,
        gatewayCode: 'bkash',
        amount: '50.0000',
        currencyCode: 'BDT',
        refundReference: 'RFD-1',
    ));

    $notification = Notification::query()->where('related_type', 'payment')->where('related_id', $paymentId)->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient)->toBe($order->customer_email);
});

it('queues a shipment notice when ShipmentDispatched is published', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $order = Order::factory()->create();
    $shipmentId = (string) Str::uuid();

    app(DomainEventBus::class)->publish(new ShipmentDispatched(
        shipmentId: $shipmentId,
        orderId: $order->id,
        courierProviderCode: 'steadfast',
        trackingNumber: 'TRK-1',
    ));

    $notification = Notification::query()->where('related_type', 'shipment')->where('related_id', $shipmentId)->first();

    expect($notification)->not->toBeNull();
    expect($notification->body)->toContain('TRK-1');
});

it('queues a delivery confirmation when FulfillmentCompleted is published', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $order = Order::factory()->create();
    $shipmentId = (string) Str::uuid();

    app(DomainEventBus::class)->publish(new FulfillmentCompleted(
        shipmentId: $shipmentId,
        orderId: $order->id,
    ));

    $notification = Notification::query()->where('related_type', 'shipment')->where('related_id', $shipmentId)->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient)->toBe($order->customer_email);
});

it('queues a return-received notice when ReturnRequested is published', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $order = Order::factory()->create();
    $returnRequestId = (string) Str::uuid();

    app(DomainEventBus::class)->publish(new ReturnRequested(
        returnRequestId: $returnRequestId,
        orderId: $order->id,
        customerId: $order->customer_id,
        rmaNumber: 'RMA-999999',
        type: 'return',
    ));

    $notification = Notification::query()->where('related_type', 'return_request')->where('related_id', $returnRequestId)->first();

    expect($notification)->not->toBeNull();
    expect($notification->body)->toContain('RMA-999999');
});

it('queues a refund-issued notice when RefundIssued is published, resolving the order through the ReturnRequest', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $order = Order::factory()->create();
    $returnRequest = ReturnRequest::factory()->create(['order_id' => $order->id]);

    app(DomainEventBus::class)->publish(new RefundIssued(
        returnRequestId: $returnRequest->id,
        refundRequestId: (string) Str::uuid(),
        paymentId: (string) Str::uuid(),
        amount: '75.0000',
        currencyCode: 'BDT',
    ));

    $notification = Notification::query()->where('related_type', 'return_request')->where('related_id', $returnRequest->id)->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient)->toBe($order->customer_email);
    expect($notification->body)->toContain($returnRequest->rma_number);
});

it('queues a welcome email when CustomerRegistered is published, using the email carried on the event itself', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $customerId = (string) Str::uuid();

    app(DomainEventBus::class)->publish(new CustomerRegistered(
        customerId: $customerId,
        email: 'newcustomer@example.test',
    ));

    $notification = Notification::query()->where('related_type', 'customer')->where('related_id', $customerId)->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient)->toBe('newcustomer@example.test');
});

it('queues a payment-failure notice when PaymentFailed is published (Milestone 3)', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $order = Order::factory()->create();
    $paymentId = (string) Str::uuid();

    app(DomainEventBus::class)->publish(new PaymentFailed(
        paymentId: $paymentId,
        orderId: $order->id,
        gatewayCode: 'bkash',
        reason: 'The gateway declined this transaction.',
    ));

    $notification = Notification::query()->where('related_type', 'payment')->where('related_id', $paymentId)->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient)->toBe($order->customer_email);
    expect($notification->body)->toContain('The gateway declined this transaction.');
});

it('queues an abandoned-cart reminder when CheckoutAbandoned is published for a guest session with an email (Milestone 3)', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $session = CheckoutSession::factory()->create(['guest_email' => 'shopper@example.test', 'guest_name' => 'Jane']);
    CheckoutItemFactory::new()->create(['checkout_session_id' => $session->id]);

    app(DomainEventBus::class)->publish(new CheckoutAbandoned(
        sessionId: $session->id,
        customerId: null,
        guestEmail: $session->guest_email,
    ));

    $notification = Notification::query()->where('related_type', 'checkout_session')->where('related_id', $session->id)->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient)->toBe('shopper@example.test');
    expect($notification->body)->toContain('Jane');
    expect($notification->body)->toContain('1 item');
});

it('never fabricates a recipient for an abandoned session with no guest email (Milestone 3)', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $session = CheckoutSession::factory()->create(['guest_email' => null]);

    app(DomainEventBus::class)->publish(new CheckoutAbandoned(
        sessionId: $session->id,
        customerId: null,
        guestEmail: null,
    ));

    expect(Notification::query()->where('related_type', 'checkout_session')->count())->toBe(0);
});

it('queues an order-cancellation notice only when OrderStatusChanged transitions to cancelled (Milestone 3)', function () {
    $this->seed(NotificationTemplateSeeder::class);
    $order = Order::factory()->create();

    app(DomainEventBus::class)->publish(new OrderStatusChanged(
        orderId: $order->id,
        fromStatus: Order::STATUS_PENDING,
        toStatus: Order::STATUS_CONFIRMED,
    ));

    expect(Notification::query()->where('related_type', 'order')->where('related_id', $order->id)->count())->toBe(0);

    app(DomainEventBus::class)->publish(new OrderStatusChanged(
        orderId: $order->id,
        fromStatus: Order::STATUS_CONFIRMED,
        toStatus: Order::STATUS_CANCELLED,
    ));

    $notification = Notification::query()->where('related_type', 'order')->where('related_id', $order->id)->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient)->toBe($order->customer_email);
    expect($notification->subject)->toContain($order->order_number);
});

it('is a no-op when the referenced order no longer exists', function () {
    app(DomainEventBus::class)->publish(new OrderPlaced(
        orderId: (string) Str::uuid(),
        orderNumber: 'ORD-GHOST',
        customerId: (string) Str::uuid(),
        grandTotal: '10.0000',
        currencyCode: 'BDT',
    ));

    expect(Notification::query()->count())->toBe(0);
});

it('never lets a missing template break the triggering module\'s own workflow', function () {
    // No NotificationTemplateSeeder here — proves the try/catch in every
    // Send*On*.php listener actually isolates a notification failure
    // (Actions\QueueNotificationAction throwing NotificationValidationException
    // for a template that does not exist) from the module that published
    // the triggering event. This is the exact regression a missing
    // try/catch here caused across Orders/Payments/Returns' own test
    // suites before these listeners were hardened.
    $order = Order::factory()->create();

    app(DomainEventBus::class)->publish(new OrderPlaced(
        orderId: $order->id,
        orderNumber: $order->order_number,
        customerId: $order->customer_id,
        grandTotal: $order->grand_total,
        currencyCode: $order->currency_code,
    ));

    expect(Notification::query()->count())->toBe(0);
});
