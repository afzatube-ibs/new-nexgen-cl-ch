<?php

declare(strict_types=1);

use App\Domains\Operations\Shipping\Actions\CalculateShippingRateAction;
use App\Domains\Operations\Shipping\Events\ShippingRateCalculated;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use App\Domains\Operations\Shipping\Models\ShippingZone;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('returns null when no matching zone or rate exists, never a fabricated zero', function () {
    $method = ShippingMethod::factory()->create();

    $result = app(CalculateShippingRateAction::class)->execute(
        shippingMethodId: $method->id,
        countryCode: 'US',
        region: '',
        weightGrams: 500,
    );

    expect($result)->toBeNull();
});

it('returns null for an unknown or archived shipping method', function () {
    $archived = ShippingMethod::factory()->archived()->create();

    $result = app(CalculateShippingRateAction::class)->execute(
        shippingMethodId: $archived->id,
        countryCode: 'BD',
        region: '',
        weightGrams: 500,
    );

    expect($result)->toBeNull();

    $unknown = app(CalculateShippingRateAction::class)->execute(
        shippingMethodId: (string) Str::uuid(),
        countryCode: 'BD',
        region: '',
        weightGrams: 500,
    );

    expect($unknown)->toBeNull();
});

it('prefers a region-specific zone over the country-wide zone', function () {
    $method = ShippingMethod::factory()->create();
    $countryWide = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => '']);
    $regionSpecific = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => 'Dhaka']);
    ShippingRate::factory()->create(['shipping_zone_id' => $countryWide->id, 'shipping_method_id' => $method->id, 'amount' => '80.0000']);
    ShippingRate::factory()->create(['shipping_zone_id' => $regionSpecific->id, 'shipping_method_id' => $method->id, 'amount' => '60.0000']);

    $result = app(CalculateShippingRateAction::class)->execute(
        shippingMethodId: $method->id,
        countryCode: 'bd',
        region: 'dhaka',
        weightGrams: 500,
    );

    expect($result->shippingZoneId)->toBe($regionSpecific->id);
    expect($result->amount)->toBe('60.0000');
});

it('selects the weight band containing the query weight', function () {
    $method = ShippingMethod::factory()->create();
    $zone = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => '']);
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $method->id,
        'min_weight_grams' => 0,
        'max_weight_grams' => 2000,
        'amount' => '60.0000',
    ]);
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $method->id,
        'min_weight_grams' => 2000,
        'max_weight_grams' => null,
        'amount' => '110.0000',
    ]);

    $under = app(CalculateShippingRateAction::class)->execute($method->id, 'BD', '', 1999);
    $atBoundary = app(CalculateShippingRateAction::class)->execute($method->id, 'BD', '', 2000);
    $over = app(CalculateShippingRateAction::class)->execute($method->id, 'BD', '', 10000);

    expect($under->amount)->toBe('60.0000');
    expect($atBoundary->amount)->toBe('110.0000');
    expect($over->amount)->toBe('110.0000');
});

it('ignores an archived rate even when the zone and method match', function () {
    $method = ShippingMethod::factory()->create();
    $zone = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => '']);
    ShippingRate::factory()->archived()->create(['shipping_zone_id' => $zone->id, 'shipping_method_id' => $method->id]);

    $result = app(CalculateShippingRateAction::class)->execute($method->id, 'BD', '', 500);

    expect($result)->toBeNull();
});

it('ignores an archived zone even when a matching active rate exists', function () {
    $method = ShippingMethod::factory()->create();
    $zone = ShippingZone::factory()->archived()->create(['country_code' => 'BD', 'region' => '']);
    ShippingRate::factory()->create(['shipping_zone_id' => $zone->id, 'shipping_method_id' => $method->id]);

    $result = app(CalculateShippingRateAction::class)->execute($method->id, 'BD', '', 500);

    expect($result)->toBeNull();
});

it('publishes ShippingRateCalculated when a rate is successfully resolved', function () {
    $method = ShippingMethod::factory()->create();
    $zone = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => '']);
    ShippingRate::factory()->create(['shipping_zone_id' => $zone->id, 'shipping_method_id' => $method->id, 'amount' => '60.0000']);

    $published = [];
    $bus = app(DomainEventBus::class);
    $bus->subscribe(ShippingRateCalculated::class, function ($event) use (&$published): void {
        $published[] = $event;
    });

    app(CalculateShippingRateAction::class)->execute($method->id, 'BD', '', 500);

    expect($published)->toHaveCount(1);
    expect($published[0]->amount)->toBe('60.0000');
});

it('does not publish an event when no rate is resolved', function () {
    $method = ShippingMethod::factory()->create();

    $published = [];
    $bus = app(DomainEventBus::class);
    $bus->subscribe(ShippingRateCalculated::class, function ($event) use (&$published): void {
        $published[] = $event;
    });

    app(CalculateShippingRateAction::class)->execute($method->id, 'US', '', 500);

    expect($published)->toHaveCount(0);
});
