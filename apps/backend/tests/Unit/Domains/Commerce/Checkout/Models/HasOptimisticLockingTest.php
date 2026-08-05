<?php

declare(strict_types=1);

use App\Domains\Commerce\Checkout\Exceptions\ConcurrencyConflictException;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('starts a new record at lock_version 1', function () {
    $session = CheckoutSession::factory()->create();

    expect($session->lock_version)->toBe(1);
});

it('increments lock_version on every update', function () {
    $session = CheckoutSession::factory()->create();

    $session->update(['coupon_code' => 'SAVE10']);

    expect($session->lock_version)->toBe(2);
});

it('does not increment lock_version on creation, only on update', function () {
    $session = CheckoutSession::factory()->make(['lock_version' => null]);
    $session->save();

    expect($session->fresh()->lock_version)->toBe(1);
});

it('accepts a write whose expected_version matches the current version', function () {
    $session = CheckoutSession::factory()->create();

    $session->assertVersionMatches(1);
})->throwsNoExceptions();

it('rejects a write whose expected_version is stale', function () {
    $session = CheckoutSession::factory()->create();
    $session->update(['coupon_code' => 'SAVE10']);

    expect(fn () => $session->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
