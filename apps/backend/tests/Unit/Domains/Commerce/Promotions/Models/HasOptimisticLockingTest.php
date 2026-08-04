<?php

declare(strict_types=1);

use App\Domains\Commerce\Promotions\Exceptions\ConcurrencyConflictException;
use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('starts a new record at lock_version 1', function () {
    $promotion = Promotion::factory()->create();

    expect($promotion->lock_version)->toBe(1);
});

it('increments lock_version on every update', function () {
    $promotion = Promotion::factory()->create();

    $promotion->update(['name' => 'Renamed']);

    expect($promotion->lock_version)->toBe(2);
});

it('does not increment lock_version on creation, only on update', function () {
    $promotion = Promotion::factory()->make(['lock_version' => null]);
    $promotion->save();

    expect($promotion->fresh()->lock_version)->toBe(1);
});

it('accepts a write whose expected_version matches the current version', function () {
    $promotion = Promotion::factory()->create();

    $promotion->assertVersionMatches(1);
})->throwsNoExceptions();

it('rejects a write whose expected_version is stale', function () {
    $promotion = Promotion::factory()->create();
    $promotion->update(['name' => 'Already changed once']);

    expect(fn () => $promotion->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
