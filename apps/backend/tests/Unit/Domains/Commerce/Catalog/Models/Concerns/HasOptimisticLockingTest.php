<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Exceptions\ConcurrencyConflictException;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Exercises the trait through Product (this module's central aggregate) —
// see Store Configuration's identical test for why this is the accepted
// shape for verifying this specific trait in each module that has its own
// copy.
uses(TestCase::class, RefreshDatabase::class);

it('assigns version 1 to a newly created aggregate', function () {
    $product = Product::factory()->create();

    expect($product->lock_version)->toBe(1);
});

it('increments the version on every update', function () {
    $product = Product::factory()->create();

    $product->update(['name' => 'Changed Once']);
    expect($product->lock_version)->toBe(2);

    $product->update(['name' => 'Changed Twice']);
    expect($product->lock_version)->toBe(3);
});

it('does not throw when the expected version matches the current version', function () {
    $product = Product::factory()->create();

    $product->assertVersionMatches(1);
})->throwsNoExceptions();

it('throws ConcurrencyConflictException when the expected version is stale', function () {
    $product = Product::factory()->create();
    $product->update(['name' => 'Changed']);

    expect(fn () => $product->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});

it('reports both the expected and actual version on conflict', function () {
    $product = Product::factory()->create();
    $product->update(['name' => 'Changed']);

    try {
        $product->assertVersionMatches(1);
        test()->fail('Expected ConcurrencyConflictException to be thrown.');
    } catch (ConcurrencyConflictException $e) {
        expect($e->expectedVersion)->toBe(1)
            ->and($e->actualVersion)->toBe(2)
            ->and($e->aggregateId)->toBe($product->id);
    }
});
