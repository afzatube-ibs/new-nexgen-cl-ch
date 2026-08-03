<?php

declare(strict_types=1);

use App\Domains\Platform\Localization\Exceptions\ConcurrencyConflictException;
use App\Domains\Platform\Localization\Models\Locale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Exercises the trait through Locale (one of this module's two consumers) —
// needs a genuine table to save() against, so this isn't achievable as a
// true zero-dependency unit test, but it still verifies exactly one piece
// of logic (DATA:VERSIONING's conflict detection) in isolation from
// anything else this module does. Mirrors Store Configuration's identically
// -named test for the same trait, kept as a separate copy per this module's
// own Exceptions\ConcurrencyConflictException — see that class's docblock.
uses(TestCase::class, RefreshDatabase::class);

it('assigns version 1 to a newly created aggregate', function () {
    $locale = Locale::factory()->create();

    expect($locale->lock_version)->toBe(1);
});

it('increments the version on every update', function () {
    $locale = Locale::factory()->create();

    $locale->update(['name' => 'Changed Once']);
    expect($locale->lock_version)->toBe(2);

    $locale->update(['name' => 'Changed Twice']);
    expect($locale->lock_version)->toBe(3);
});

it('does not throw when the expected version matches the current version', function () {
    $locale = Locale::factory()->create();

    $locale->assertVersionMatches(1);
})->throwsNoExceptions();

it('throws ConcurrencyConflictException when the expected version is stale', function () {
    $locale = Locale::factory()->create();
    $locale->update(['name' => 'Changed']);

    expect(fn () => $locale->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});

it('reports both the expected and actual version on conflict', function () {
    $locale = Locale::factory()->create();
    $locale->update(['name' => 'Changed']);

    try {
        $locale->assertVersionMatches(1);
        test()->fail('Expected ConcurrencyConflictException to be thrown.');
    } catch (ConcurrencyConflictException $e) {
        expect($e->expectedVersion)->toBe(1)
            ->and($e->actualVersion)->toBe(2)
            ->and($e->aggregateId)->toBe($locale->id);
    }
});
