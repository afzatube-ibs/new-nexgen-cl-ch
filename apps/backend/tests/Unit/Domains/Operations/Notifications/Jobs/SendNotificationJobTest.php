<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Actions\SendNotificationAction;
use App\Domains\Operations\Notifications\Jobs\SendNotificationJob;
use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('sends the notification and does not re-dispatch on success', function () {
    Queue::fake();
    config(['notifications.mailgun.api_key' => 'test-key']);
    config(['notifications.mailgun.domain' => 'mg.example.test']);
    config(['notifications.mailgun.from_address' => 'no-reply@example.test']);
    Http::fake(['api.mailgun.net/*' => Http::response(['id' => '<mg-job-1>'])]);

    $notification = Notification::factory()->queued()->create(['provider_code' => 'mailgun']);

    (new SendNotificationJob($notification->id))->handle(app(SendNotificationAction::class));

    expect($notification->fresh()->status)->toBe(Notification::STATUS_SENT);
    Queue::assertNotPushed(SendNotificationJob::class);
});

it('re-dispatches a delayed instance of itself when the action schedules a retry', function () {
    Queue::fake();
    config(['notifications.mailgun.api_key' => 'test-key']);
    config(['notifications.mailgun.domain' => 'mg.example.test']);
    config(['notifications.mailgun.from_address' => 'no-reply@example.test']);
    Http::fake(['api.mailgun.net/*' => Http::response(['message' => 'Try again later.'], 400)]);

    $notification = Notification::factory()->queued()->create(['provider_code' => 'mailgun', 'attempts_count' => 0, 'max_attempts' => 5]);

    $job = new SendNotificationJob($notification->id);
    $job->onConnection('sync');
    $job->onQueue('notifications');
    $job->handle(app(SendNotificationAction::class));

    expect($notification->fresh()->status)->toBe(Notification::STATUS_QUEUED);
    Queue::assertPushed(SendNotificationJob::class, fn (SendNotificationJob $pushed) => $pushed->notificationId === $notification->id);
});
