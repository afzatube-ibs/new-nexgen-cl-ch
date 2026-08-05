<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Events\OrderPlaced;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

// This is the platform's first real, production cross-domain event
// subscriber (ARCHITECTURE_REVIEW.md A-4) — this test exercises the whole
// wiring path (App\Providers\AppServiceProvider's subscription, through
// the in-process Laravel dispatcher, to Fulfillment's own Action), not
// just the listener class in isolation, since the wiring itself is the
// part with no prior precedent in this codebase to lean on.
uses(TestCase::class, RefreshDatabase::class);

it('creates a Shipment when OrderPlaced is published on the real, application-wired event bus', function () {
    $orderId = (string) Str::uuid();
    $customerId = (string) Str::uuid();

    app(DomainEventBus::class)->publish(new OrderPlaced(
        orderId: $orderId,
        orderNumber: 'ORD-100001',
        customerId: $customerId,
        grandTotal: '250.0000',
        currencyCode: 'BDT',
    ));

    $shipment = Shipment::query()->where('order_id', $orderId)->first();

    expect($shipment)->not->toBeNull();
    expect($shipment->order_number)->toBe('ORD-100001');
    expect($shipment->customer_id)->toBe($customerId);
    expect($shipment->grand_total)->toBe('250.0000');
    expect($shipment->currency_code)->toBe('BDT');
    expect($shipment->status)->toBe(Shipment::STATUS_PENDING);
});

it('is idempotent against a duplicate OrderPlaced delivery for the same order', function () {
    $orderId = (string) Str::uuid();

    $event = new OrderPlaced(
        orderId: $orderId,
        orderNumber: 'ORD-100002',
        customerId: (string) Str::uuid(),
        grandTotal: '100.0000',
        currencyCode: 'BDT',
    );

    app(DomainEventBus::class)->publish($event);
    app(DomainEventBus::class)->publish($event);

    expect(Shipment::query()->where('order_id', $orderId)->count())->toBe(1);
});
