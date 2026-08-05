<?php

declare(strict_types=1);

use App\Domains\Operations\Fulfillment\Actions\DispatchShipmentAction;
use App\Domains\Operations\Fulfillment\Events\ShipmentDispatched;
use App\Domains\Operations\Fulfillment\Exceptions\ConcurrencyConflictException;
use App\Domains\Operations\Fulfillment\Exceptions\ShipmentValidationException;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('refuses to dispatch a shipment with no destination', function () {
    $shipment = Shipment::factory()->create();

    expect(fn () => app(DispatchShipmentAction::class)->execute($shipment, null, 'TRK-1', 1, null))
        ->toThrow(ShipmentValidationException::class);
});

it('dispatches manually with an operator-supplied tracking number when no courier is configured', function () {
    $shipment = Shipment::factory()->packed()->create();

    $result = app(DispatchShipmentAction::class)->execute($shipment, null, 'TRK-MANUAL-1', 1, null);

    expect($result->status)->toBe(Shipment::STATUS_DISPATCHED);
    expect($result->tracking_number)->toBe('TRK-MANUAL-1');
    expect($result->courier_consignment_id)->toBeNull();
});

it('refuses manual dispatch with no tracking number and no automatable courier', function () {
    $shipment = Shipment::factory()->packed()->create();

    expect(fn () => app(DispatchShipmentAction::class)->execute($shipment, null, null, 1, null))
        ->toThrow(ShipmentValidationException::class);
});

it('books the shipment through the resolved courier and stores its consignment id and tracking number', function () {
    Http::fake([
        'portal.packzy.com/api/v1/create_order' => Http::response([
            'consignment' => ['consignment_id' => 999, 'tracking_code' => 'TRK-STEADFAST-1'],
        ]),
    ]);

    config(['shipping.steadfast.api_key' => 'key', 'shipping.steadfast.secret_key' => 'secret']);

    $method = ShippingMethod::factory()->create(['provider_code' => 'steadfast']);
    $shipment = Shipment::factory()->packed()->create();

    $result = app(DispatchShipmentAction::class)->execute($shipment, $method->id, null, 1, null);

    expect($result->status)->toBe(Shipment::STATUS_DISPATCHED);
    expect($result->courier_provider_code)->toBe('steadfast');
    expect($result->courier_consignment_id)->toBe('999');
    expect($result->tracking_number)->toBe('TRK-STEADFAST-1');
    expect($result->shipping_method_id)->toBe($method->id);
});

it('publishes ShipmentDispatched on successful dispatch', function () {
    $shipment = Shipment::factory()->packed()->create();

    $published = [];
    app(DomainEventBus::class)->subscribe(ShipmentDispatched::class, function ($event) use (&$published): void {
        $published[] = $event;
    });

    app(DispatchShipmentAction::class)->execute($shipment, null, 'TRK-1', 1, null);

    expect($published)->toHaveCount(1);
    expect($published[0]->trackingNumber)->toBe('TRK-1');
});

it('rejects a stale expected_version', function () {
    $shipment = Shipment::factory()->packed()->create();
    $shipment->update(['order_number' => 'ORD-changed']);

    expect(fn () => app(DispatchShipmentAction::class)->execute($shipment, null, 'TRK-1', 1, null))
        ->toThrow(ConcurrencyConflictException::class);
});
