<?php

declare(strict_types=1);

use App\Domains\Operations\Fulfillment\Exceptions\ConcurrencyConflictException;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('starts a new record at lock_version 1', function () {
    $shipment = Shipment::factory()->create();

    expect($shipment->lock_version)->toBe(1);
});

it('increments lock_version on every update', function () {
    $shipment = Shipment::factory()->create();

    $shipment->update(['order_number' => 'ORD-999999']);

    expect($shipment->lock_version)->toBe(2);
});

it('does not increment lock_version on creation, only on update', function () {
    $shipment = Shipment::factory()->make(['lock_version' => null]);
    $shipment->save();

    expect($shipment->fresh()->lock_version)->toBe(1);
});

it('accepts a write whose expected_version matches the current version', function () {
    $shipment = Shipment::factory()->create();

    $shipment->assertVersionMatches(1);
})->throwsNoExceptions();

it('rejects a write whose expected_version is stale', function () {
    $shipment = Shipment::factory()->create();
    $shipment->update(['order_number' => 'ORD-999999']);

    expect(fn () => $shipment->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
