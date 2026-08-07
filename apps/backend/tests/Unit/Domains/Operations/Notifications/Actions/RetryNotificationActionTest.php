<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Actions\RetryNotificationAction;
use App\Domains\Operations\Notifications\Exceptions\NotificationValidationException;
use App\Domains\Operations\Notifications\Jobs\SendNotificationJob;
use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('retries a failed notification, granting exactly one further attempt', function () {
    Queue::fake();

    $notification = Notification::factory()->failed()->create(['attempts_count' => 5, 'max_attempts' => 5]);

    $result = app(RetryNotificationAction::class)->execute($notification, actorId: null);

    expect($result->status)->toBe(Notification::STATUS_QUEUED);
    expect($result->max_attempts)->toBe(6);

    Queue::assertPushed(SendNotificationJob::class, fn (SendNotificationJob $job) => $job->notificationId === $notification->id);
});

it('refuses to retry a notification that is not failed', function () {
    $notification = Notification::factory()->queued()->create();

    expect(fn () => app(RetryNotificationAction::class)->execute($notification, actorId: null))
        ->toThrow(NotificationValidationException::class);
});
