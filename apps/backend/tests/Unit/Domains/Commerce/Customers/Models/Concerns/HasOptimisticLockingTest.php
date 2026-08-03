<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Exceptions\ConcurrencyConflictException;
use App\Domains\Commerce\Customers\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Exercises the trait through Customer (its aggregate root) — needs a
// genuine table to save() against, so this isn't achievable as a true
// zero-dependency unit test, but it still verifies exactly one piece of
// logic (DATA:VERSIONING's conflict detection) in isolation from anything
// else this module does. Mirrors every other module's identically-named
// test for the same trait, kept as a separate copy per this module's own
// Exceptions\ConcurrencyConflictException — see that class's docblock.
uses(TestCase::class, RefreshDatabase::class);

it('assigns version 1 to a newly created aggregate', function () {
    $customer = Customer::factory()->create();

    expect($customer->lock_version)->toBe(1);
});

it('increments the version on every update', function () {
    $customer = Customer::factory()->create();

    $customer->update(['name' => 'Changed Once']);
    expect($customer->lock_version)->toBe(2);

    $customer->update(['name' => 'Changed Twice']);
    expect($customer->lock_version)->toBe(3);
});

it('does not throw when the expected version matches the current version', function () {
    $customer = Customer::factory()->create();

    $customer->assertVersionMatches(1);
})->throwsNoExceptions();

it('throws ConcurrencyConflictException when the expected version is stale', function () {
    $customer = Customer::factory()->create();
    $customer->update(['name' => 'Changed']);

    expect(fn () => $customer->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});

it('reports both the expected and actual version on conflict', function () {
    $customer = Customer::factory()->create();
    $customer->update(['name' => 'Changed']);

    try {
        $customer->assertVersionMatches(1);
        test()->fail('Expected ConcurrencyConflictException to be thrown.');
    } catch (ConcurrencyConflictException $e) {
        expect($e->expectedVersion)->toBe(1)
            ->and($e->actualVersion)->toBe(2)
            ->and($e->aggregateId)->toBe($customer->id);
    }
});

it('bumps the aggregate version via touchAggregateVersion without changing other fields', function () {
    $customer = Customer::factory()->create(['name' => 'Unchanged Name']);

    $customer->touchAggregateVersion();

    expect($customer->lock_version)->toBe(2)
        ->and($customer->fresh()->name)->toBe('Unchanged Name');
});
