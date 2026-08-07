<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Actions;

use App\Domains\Operations\Notifications\Audit\AuditLogger;
use App\Domains\Operations\Notifications\Exceptions\NotificationValidationException;
use App\Domains\Operations\Notifications\Jobs\SendNotificationJob;
use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Support\Facades\DB;

/**
 * Operator-facing recovery path for a Notification that
 * Actions\SendNotificationAction recorded as permanently `failed` (its
 * automatic Retry Policy exhausted) — mirrors Returns' Actions\
 * RetryRefundRequestAction exactly. Grants exactly one further attempt
 * beyond the exhausted automatic budget by incrementing `max_attempts`
 * rather than resetting `attempts_count` to zero, so the full delivery
 * history (every prior Models\NotificationDeliveryAttempt row) stays
 * intact and honest — this is one more try, not a fresh notification.
 */
final readonly class RetryNotificationAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Notification $notification, ?string $actorId): Notification
    {
        if ($notification->status !== Notification::STATUS_FAILED) {
            throw new NotificationValidationException('notification_not_retryable', "Notification [{$notification->id}] is not in a failed state.");
        }

        return DB::transaction(function () use ($notification, $actorId) {
            /** @var Notification $notification */
            $notification = Notification::query()->lockForUpdate()->findOrFail($notification->id);

            if ($notification->status !== Notification::STATUS_FAILED) {
                throw new NotificationValidationException('notification_not_retryable', "Notification [{$notification->id}] is not in a failed state.");
            }

            $notification->assertCanTransitionTo(Notification::STATUS_QUEUED);
            $notification->max_attempts = $notification->attempts_count + 1;
            $notification->status = Notification::STATUS_QUEUED;
            $notification->next_retry_at = null;
            $notification->save();

            $this->auditLogger->log(
                action: 'notification.retry_requested',
                actorId: $actorId,
                targetType: Notification::class,
                targetId: $notification->id,
                after: ['status' => $notification->status, 'max_attempts' => $notification->max_attempts],
            );

            SendNotificationJob::dispatch($notification->id)
                ->onConnection(config('notifications.queue_connection'))
                ->onQueue(config('notifications.queue_name'));

            return $notification;
        });
    }
}
