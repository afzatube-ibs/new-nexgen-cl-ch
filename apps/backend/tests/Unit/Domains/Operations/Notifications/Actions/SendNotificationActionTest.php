<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Actions\SendNotificationAction;
use App\Domains\Operations\Notifications\Events\NotificationFailed;
use App\Domains\Operations\Notifications\Events\NotificationSent;
use App\Domains\Operations\Notifications\Models\Notification;
use App\Domains\Operations\Notifications\Models\NotificationDeliveryAttempt;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function configuredMailgun(): void
{
    config(['notifications.mailgun.api_key' => 'test-key']);
    config(['notifications.mailgun.domain' => 'mg.example.test']);
    config(['notifications.mailgun.from_address' => 'no-reply@example.test']);
}

it('sends a queued notification and marks it sent on success', function () {
    configuredMailgun();
    Http::fake(['api.mailgun.net/*' => Http::response(['id' => '<mg-1>'])]);

    $notification = Notification::factory()->queued()->create(['provider_code' => 'mailgun']);

    $result = app(SendNotificationAction::class)->execute($notification);

    expect($result->status)->toBe(Notification::STATUS_SENT);
    expect($result->provider_code)->toBe('mailgun');
    expect($result->attempts_count)->toBe(1);
    expect($result->sent_at)->not->toBeNull();
    expect(NotificationDeliveryAttempt::query()->where('notification_id', $notification->id)->where('status', 'succeeded')->count())->toBe(1);
});

it('publishes NotificationSent on a successful delivery', function () {
    configuredMailgun();
    Http::fake(['api.mailgun.net/*' => Http::response(['id' => '<mg-2>'])]);

    $notification = Notification::factory()->queued()->create(['provider_code' => 'mailgun']);

    $published = [];
    app(DomainEventBus::class)->subscribe(NotificationSent::class, function ($event) use (&$published): void {
        $published[] = $event;
    });

    app(SendNotificationAction::class)->execute($notification);

    expect($published)->toHaveCount(1);
    expect($published[0]->notificationId)->toBe($notification->id);
});

it('schedules a retry with backoff on a failure that has not exhausted its attempts', function () {
    configuredMailgun();
    Http::fake(['api.mailgun.net/*' => Http::response(['message' => 'Sandbox domains require authorized recipients.'], 400)]);

    $notification = Notification::factory()->queued()->create(['provider_code' => 'mailgun', 'attempts_count' => 0, 'max_attempts' => 5]);

    $result = app(SendNotificationAction::class)->execute($notification);

    expect($result->status)->toBe(Notification::STATUS_QUEUED);
    expect($result->attempts_count)->toBe(1);
    expect($result->next_retry_at)->not->toBeNull();
    expect($result->failure_reason)->toBe('Sandbox domains require authorized recipients.');
    expect(NotificationDeliveryAttempt::query()->where('notification_id', $notification->id)->where('status', 'failed')->count())->toBe(1);
});

it('permanently fails and publishes NotificationFailed once retries are exhausted', function () {
    configuredMailgun();
    Http::fake(['api.mailgun.net/*' => Http::response(['message' => 'Permanent failure.'], 400)]);

    $notification = Notification::factory()->queued()->create(['provider_code' => 'mailgun', 'attempts_count' => 4, 'max_attempts' => 5]);

    $published = [];
    app(DomainEventBus::class)->subscribe(NotificationFailed::class, function ($event) use (&$published): void {
        $published[] = $event;
    });

    $result = app(SendNotificationAction::class)->execute($notification);

    expect($result->status)->toBe(Notification::STATUS_FAILED);
    expect($result->attempts_count)->toBe(5);
    expect($result->next_retry_at)->toBeNull();
    expect($result->failed_at)->not->toBeNull();
    expect($published)->toHaveCount(1);
});

it('is a no-op for an already-terminal notification', function () {
    $notification = Notification::factory()->sent()->create();

    $result = app(SendNotificationAction::class)->execute($notification);

    expect($result->status)->toBe(Notification::STATUS_SENT);
    expect(NotificationDeliveryAttempt::query()->where('notification_id', $notification->id)->count())->toBe(0);
});

it('fails gracefully when the notification names a provider that is not configured', function () {
    $notification = Notification::factory()->queued()->create(['provider_code' => 'mailgun']);

    $result = app(SendNotificationAction::class)->execute($notification);

    expect($result->status)->toBe(Notification::STATUS_QUEUED); // retryable — not yet exhausted
    expect($result->failure_reason)->not->toBeNull();
});

it('never leaves a notification stuck in sending when a provider throws a raw connection-level exception', function () {
    configuredMailgun();
    Http::fake(function () {
        throw new ConnectionException('Could not resolve host: api.mailgun.net.');
    });

    $notification = Notification::factory()->queued()->create(['provider_code' => 'mailgun', 'attempts_count' => 0, 'max_attempts' => 5]);

    $result = app(SendNotificationAction::class)->execute($notification);

    expect($result->status)->toBe(Notification::STATUS_QUEUED);
    expect($result->attempts_count)->toBe(1);
    expect($result->failure_reason)->toContain('Could not resolve host');
    expect(NotificationDeliveryAttempt::query()->where('notification_id', $notification->id)->where('status', 'failed')->count())->toBe(1);
});
