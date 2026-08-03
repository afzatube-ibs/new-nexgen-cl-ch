<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Exceptions\ConcurrencyConflictException;
use App\Domains\Commerce\Pricing\Models\TaxClass;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('starts a new record at lock_version 1', function () {
    $class = TaxClass::factory()->create();

    expect($class->lock_version)->toBe(1);
});

it('increments lock_version on every update', function () {
    $class = TaxClass::factory()->create();

    $class->update(['name' => 'Renamed']);

    expect($class->lock_version)->toBe(2);
});

it('does not increment lock_version on creation, only on update', function () {
    $class = TaxClass::factory()->make(['lock_version' => null]);
    $class->save();

    expect($class->fresh()->lock_version)->toBe(1);
});

it('accepts a write whose expected_version matches the current version', function () {
    $class = TaxClass::factory()->create();

    $class->assertVersionMatches(1);
})->throwsNoExceptions();

it('rejects a write whose expected_version is stale', function () {
    $class = TaxClass::factory()->create();
    $class->update(['name' => 'Already changed once']);

    expect(fn () => $class->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
