<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Exceptions\ConcurrencyConflictException;
use App\Domains\Commerce\Payments\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('starts a new record at lock_version 1', function () {
    $payment = Payment::factory()->create();

    expect($payment->lock_version)->toBe(1);
});

it('increments lock_version on every update', function () {
    $payment = Payment::factory()->create();

    $payment->update(['failure_reason' => 'test']);

    expect($payment->lock_version)->toBe(2);
});

it('accepts a write whose expected_version matches the current version', function () {
    $payment = Payment::factory()->create();

    $payment->assertVersionMatches(1);
})->throwsNoExceptions();

it('rejects a write whose expected_version is stale', function () {
    $payment = Payment::factory()->create();
    $payment->update(['failure_reason' => 'test']);

    expect(fn () => $payment->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
