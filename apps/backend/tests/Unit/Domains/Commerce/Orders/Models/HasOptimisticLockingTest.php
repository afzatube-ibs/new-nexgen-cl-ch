<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Exceptions\ConcurrencyConflictException;
use App\Domains\Commerce\Orders\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('starts a new record at lock_version 1', function () {
    $order = Order::factory()->create();

    expect($order->lock_version)->toBe(1);
});

it('increments lock_version on every update', function () {
    $order = Order::factory()->create();

    $order->update(['status' => Order::STATUS_CONFIRMED]);

    expect($order->lock_version)->toBe(2);
});

it('does not increment lock_version on creation, only on update', function () {
    $order = Order::factory()->make(['lock_version' => null]);
    $order->save();

    expect($order->fresh()->lock_version)->toBe(1);
});

it('accepts a write whose expected_version matches the current version', function () {
    $order = Order::factory()->create();

    $order->assertVersionMatches(1);
})->throwsNoExceptions();

it('rejects a write whose expected_version is stale', function () {
    $order = Order::factory()->create();
    $order->update(['status' => Order::STATUS_CONFIRMED]);

    expect(fn () => $order->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
