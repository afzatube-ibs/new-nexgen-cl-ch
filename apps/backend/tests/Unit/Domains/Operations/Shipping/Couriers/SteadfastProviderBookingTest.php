<?php

declare(strict_types=1);

use App\Domains\Operations\Shipping\Couriers\SteadfastProvider;
use App\Domains\Operations\Shipping\Couriers\Support\ShipmentBookingRequest;
use App\Domains\Operations\Shipping\Exceptions\CourierBookingFailedException;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

// Boots the application container without RefreshDatabase — these tests
// exercise real HTTP calls (faked via Http::fake()) and the app()
// container, neither of which needs a database, mirroring Payments'
// SslcommerzGatewayTest exactly.
uses(TestCase::class);

function steadfastProvider(): SteadfastProvider
{
    return new SteadfastProvider([
        'api_key' => 'test-key',
        'secret_key' => 'test-secret',
        'base_url' => 'https://portal.packzy.test/api/v1',
    ], app(HttpFactory::class));
}

function shipmentBookingRequest(): ShipmentBookingRequest
{
    return new ShipmentBookingRequest(
        invoiceReference: 'ORD-000001',
        recipientName: 'Jane Doe',
        recipientPhone: '01700000000',
        addressLine1: 'House 1, Road 2',
        addressLine2: null,
        city: 'Dhaka',
        region: 'Dhaka',
        postalCode: '1207',
        countryCode: 'BD',
        itemDescription: 'T-Shirt',
        weightGrams: 500,
        codAmount: '1200.0000',
    );
}

it('reports supportsBooking true', function () {
    expect(steadfastProvider()->supportsBooking())->toBeTrue();
});

it('books a shipment and returns the courier consignment id and tracking code', function () {
    Http::fake([
        'portal.packzy.test/api/v1/create_order' => Http::response([
            'status' => 200,
            'consignment' => [
                'consignment_id' => 12345,
                'tracking_code' => 'TRK-ABC-1',
            ],
        ]),
    ]);

    $result = steadfastProvider()->bookShipment(shipmentBookingRequest());

    expect($result->courierConsignmentId)->toBe('12345');
    expect($result->trackingNumber)->toBe('TRK-ABC-1');
});

it('throws a typed exception when the courier returns a failure status', function () {
    Http::fake([
        'portal.packzy.test/api/v1/create_order' => Http::response(['error' => 'invalid'], 422),
    ]);

    expect(fn () => steadfastProvider()->bookShipment(shipmentBookingRequest()))
        ->toThrow(CourierBookingFailedException::class);
});
