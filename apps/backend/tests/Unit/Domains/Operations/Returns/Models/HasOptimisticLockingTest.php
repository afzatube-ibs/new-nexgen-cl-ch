<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Exceptions\ConcurrencyConflictException;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('starts a new record at lock_version 1', function () {
    $returnRequest = ReturnRequest::factory()->create();

    expect($returnRequest->lock_version)->toBe(1);
});

it('increments lock_version on every update', function () {
    $returnRequest = ReturnRequest::factory()->create();

    $returnRequest->update(['reason_details' => 'Updated details.']);

    expect($returnRequest->lock_version)->toBe(2);
});

it('does not increment lock_version on creation, only on update', function () {
    $returnRequest = ReturnRequest::factory()->make(['lock_version' => null]);
    $returnRequest->save();

    expect($returnRequest->fresh()->lock_version)->toBe(1);
});

it('accepts a write whose expected_version matches the current version', function () {
    $returnRequest = ReturnRequest::factory()->create();

    $returnRequest->assertVersionMatches(1);
})->throwsNoExceptions();

it('rejects a write whose expected_version is stale', function () {
    $returnRequest = ReturnRequest::factory()->create();
    $returnRequest->update(['reason_details' => 'Updated details.']);

    expect(fn () => $returnRequest->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
