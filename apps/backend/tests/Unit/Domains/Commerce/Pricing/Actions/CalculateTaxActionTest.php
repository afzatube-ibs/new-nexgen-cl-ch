<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Actions\CalculateTaxAction;
use App\Domains\Commerce\Pricing\Models\TaxClass;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('resolves zero tax when no matching zone or rate exists', function () {
    $class = TaxClass::factory()->create();

    $result = (new CalculateTaxAction)->execute(
        taxClassId: $class->id,
        countryCode: 'US',
        region: 'CA',
        amount: '100.00',
    );

    expect($result->rate)->toBe('0.0000');
    expect($result->taxAmount)->toBe('0.0000');
    expect($result->totalAmount)->toBe('100.0000');
    expect($result->taxZoneId)->toBeNull();
});

it('prefers a region-specific zone over the country-wide zone', function () {
    $class = TaxClass::factory()->create();
    $countryWide = TaxZone::factory()->create(['country_code' => 'US', 'region' => '']);
    $regionSpecific = TaxZone::factory()->create(['country_code' => 'US', 'region' => 'CA']);
    TaxRate::factory()->create(['tax_zone_id' => $countryWide->id, 'tax_class_id' => $class->id, 'rate' => '5.0000']);
    TaxRate::factory()->create(['tax_zone_id' => $regionSpecific->id, 'tax_class_id' => $class->id, 'rate' => '8.5000']);

    $result = (new CalculateTaxAction)->execute(
        taxClassId: $class->id,
        countryCode: 'us',
        region: 'ca',
        amount: '100.00',
    );

    expect($result->taxZoneId)->toBe($regionSpecific->id);
    expect($result->rate)->toBe('8.5000');
    expect($result->taxAmount)->toBe('8.5000');
    expect($result->totalAmount)->toBe('108.5000');
});

it('falls back to the country-wide zone when no region-specific zone matches', function () {
    $class = TaxClass::factory()->create();
    $countryWide = TaxZone::factory()->create(['country_code' => 'US', 'region' => '']);
    TaxRate::factory()->create(['tax_zone_id' => $countryWide->id, 'tax_class_id' => $class->id, 'rate' => '5.0000']);

    $result = (new CalculateTaxAction)->execute(
        taxClassId: $class->id,
        countryCode: 'US',
        region: 'TX',
        amount: '200.00',
    );

    expect($result->taxZoneId)->toBe($countryWide->id);
    expect($result->rate)->toBe('5.0000');
    expect($result->taxAmount)->toBe('10.0000');
    expect($result->totalAmount)->toBe('210.0000');
});

it('ignores an archived rate even when the zone and class match', function () {
    $class = TaxClass::factory()->create();
    $zone = TaxZone::factory()->create(['country_code' => 'US', 'region' => '']);
    TaxRate::factory()->archived()->create(['tax_zone_id' => $zone->id, 'tax_class_id' => $class->id, 'rate' => '9.0000']);

    $result = (new CalculateTaxAction)->execute(
        taxClassId: $class->id,
        countryCode: 'US',
        region: '',
        amount: '50.00',
    );

    expect($result->rate)->toBe('0.0000');
    expect($result->taxZoneId)->toBeNull();
});

it('ignores an archived zone even when a matching active rate exists', function () {
    $class = TaxClass::factory()->create();
    $zone = TaxZone::factory()->archived()->create(['country_code' => 'US', 'region' => '']);
    TaxRate::factory()->create(['tax_zone_id' => $zone->id, 'tax_class_id' => $class->id, 'rate' => '9.0000']);

    $result = (new CalculateTaxAction)->execute(
        taxClassId: $class->id,
        countryCode: 'US',
        region: '',
        amount: '50.00',
    );

    expect($result->rate)->toBe('0.0000');
});
