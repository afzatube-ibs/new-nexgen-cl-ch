<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Exceptions\ConcurrencyConflictException;
use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('starts a new record at lock_version 1', function () {
    $notification = Notification::factory()->create();

    expect($notification->lock_version)->toBe(1);
});

it('increments lock_version on every update', function () {
    $notification = Notification::factory()->create();

    $notification->update(['subject' => 'Updated subject']);

    expect($notification->lock_version)->toBe(2);
});

it('accepts a write whose expected_version matches the current version', function () {
    $notification = Notification::factory()->create();

    $notification->assertVersionMatches(1);
})->throwsNoExceptions();

it('rejects a write whose expected_version is stale', function () {
    $notification = Notification::factory()->create();
    $notification->update(['subject' => 'Updated subject']);

    expect(fn () => $notification->assertVersionMatches(1))
        ->toThrow(ConcurrencyConflictException::class);
});
