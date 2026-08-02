<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Exceptions\ConcurrencyConflictException;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Exercises the trait through User (its simplest real consumer) — needs a
// genuine table to save() against, so this isn't achievable as a true
// zero-dependency unit test, but it still verifies exactly one piece of
// logic (DATA:VERSIONING's conflict detection) in isolation from anything
// else this module does.
uses(TestCase::class, RefreshDatabase::class);

it('assigns version 1 to a newly created aggregate', function () {
    $user = User::factory()->create();

    expect($user->lock_version)->toBe(1);
});

it('increments the version on every update', function () {
    $user = User::factory()->create();

    $user->update(['name' => 'Changed Once']);
    expect($user->lock_version)->toBe(2);

    $user->update(['name' => 'Changed Twice']);
    expect($user->lock_version)->toBe(3);
});

it('does not throw when the expected version matches the current version', function () {
    $user = User::factory()->create();

    $user->assertVersionMatches(1);
})->throwsNoExceptions();

it('throws ConcurrencyConflictException when the expected version is stale', function () {
    $user = User::factory()->create();
    $user->update(['name' => 'Changed']);

    expect(fn () => $user->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});

it('reports both the expected and actual version on conflict', function () {
    $user = User::factory()->create();
    $user->update(['name' => 'Changed']);

    try {
        $user->assertVersionMatches(1);
        $this->fail('Expected ConcurrencyConflictException to be thrown.');
    } catch (ConcurrencyConflictException $e) {
        expect($e->expectedVersion)->toBe(1)
            ->and($e->actualVersion)->toBe(2)
            ->and($e->aggregateId)->toBe($user->id);
    }
});
