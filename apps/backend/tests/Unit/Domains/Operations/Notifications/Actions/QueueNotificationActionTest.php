<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Exceptions\NotificationValidationException;
use App\Domains\Operations\Notifications\Jobs\SendNotificationJob;
use App\Domains\Operations\Notifications\Models\Notification;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('queues a notification from a template, rendering its merge fields, and dispatches the send job', function () {
    Queue::fake();

    $template = NotificationTemplate::factory()->create([
        'code' => 'order.confirmation',
        'channel' => NotificationTemplate::CHANNEL_EMAIL,
        'subject' => 'Order {{order_number}} confirmed',
        'body' => 'Hi {{customer_name}}, thanks!',
    ]);

    $notification = app(QueueNotificationAction::class)->execute(
        channel: NotificationTemplate::CHANNEL_EMAIL,
        recipient: 'customer@example.test',
        templateCode: 'order.confirmation',
        mergeData: ['order_number' => 'ORD-1', 'customer_name' => 'Jane'],
        relatedType: 'order',
        relatedId: (string) Str::uuid(),
    );

    expect($notification->status)->toBe(Notification::STATUS_QUEUED);
    expect($notification->notification_template_id)->toBe($template->id);
    expect($notification->subject)->toBe('Order ORD-1 confirmed');
    expect($notification->body)->toBe('Hi Jane, thanks!');
    expect($notification->lock_version)->toBe(2); // created (v1) then transitioned to queued (v2)

    Queue::assertPushed(SendNotificationJob::class, fn (SendNotificationJob $job) => $job->notificationId === $notification->id);
});

it('queues a notification from inline subject/body when no template_code is given', function () {
    Queue::fake();

    $notification = app(QueueNotificationAction::class)->execute(
        channel: NotificationTemplate::CHANNEL_EMAIL,
        recipient: 'customer@example.test',
        subject: 'Ad-hoc subject',
        body: 'Ad-hoc body',
    );

    expect($notification->notification_template_id)->toBeNull();
    expect($notification->subject)->toBe('Ad-hoc subject');
    expect($notification->body)->toBe('Ad-hoc body');
});

it('refuses to queue a notification naming a template code that does not exist for the channel', function () {
    expect(fn () => app(QueueNotificationAction::class)->execute(
        channel: NotificationTemplate::CHANNEL_EMAIL,
        recipient: 'customer@example.test',
        templateCode: 'nonexistent.template',
    ))->toThrow(NotificationValidationException::class);
});

it('refuses to queue a notification with neither a template nor inline content', function () {
    expect(fn () => app(QueueNotificationAction::class)->execute(
        channel: NotificationTemplate::CHANNEL_EMAIL,
        recipient: 'customer@example.test',
    ))->toThrow(NotificationValidationException::class);
});

it('ignores an inactive template', function () {
    NotificationTemplate::factory()->inactive()->create(['code' => 'inactive.one', 'channel' => NotificationTemplate::CHANNEL_EMAIL]);

    expect(fn () => app(QueueNotificationAction::class)->execute(
        channel: NotificationTemplate::CHANNEL_EMAIL,
        recipient: 'customer@example.test',
        templateCode: 'inactive.one',
    ))->toThrow(NotificationValidationException::class);
});
