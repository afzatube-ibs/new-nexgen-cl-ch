<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Actions\CancelNotificationAction;
use App\Domains\Operations\Notifications\Exceptions\InvalidNotificationStatusTransitionException;
use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('cancels a pending notification', function () {
    $notification = Notification::factory()->create();

    $result = app(CancelNotificationAction::class)->execute($notification, expectedVersion: 1, actorId: null);

    expect($result->status)->toBe(Notification::STATUS_CANCELLED);
    expect($result->cancelled_at)->not->toBeNull();
});

it('refuses to cancel a notification already sending', function () {
    $notification = Notification::factory()->sending()->create();

    expect(fn () => app(CancelNotificationAction::class)->execute($notification, expectedVersion: 1, actorId: null))
        ->toThrow(InvalidNotificationStatusTransitionException::class);
});
