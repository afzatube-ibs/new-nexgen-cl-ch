<?php

declare(strict_types=1);

use App\Domains\Operations\Shipping\Exceptions\ConcurrencyConflictException;
use App\Domains\Operations\Shipping\Models\ShippingZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('starts a new record at lock_version 1', function () {
    $zone = ShippingZone::factory()->create();

    expect($zone->lock_version)->toBe(1);
});

it('increments lock_version on every update', function () {
    $zone = ShippingZone::factory()->create();

    $zone->update(['name' => 'Renamed']);

    expect($zone->lock_version)->toBe(2);
});

it('does not increment lock_version on creation, only on update', function () {
    $zone = ShippingZone::factory()->make(['lock_version' => null]);
    $zone->save();

    expect($zone->fresh()->lock_version)->toBe(1);
});

it('accepts a write whose expected_version matches the current version', function () {
    $zone = ShippingZone::factory()->create();

    $zone->assertVersionMatches(1);
})->throwsNoExceptions();

it('rejects a write whose expected_version is stale', function () {
    $zone = ShippingZone::factory()->create();
    $zone->update(['name' => 'Already changed once']);

    expect(fn () => $zone->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
